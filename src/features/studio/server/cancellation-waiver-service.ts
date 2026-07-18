import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  cancellationCharge,
  cancellationCreditAllocation,
  classCredit,
  commerceOperation,
} from "@/db/schema";
import { cancellationChargeCanWaive } from "@/features/studio/lib/cancellation-charge-rules";

import { exactCancellationLocation } from "./cancellation-access";
import { cancelUnpaidCancellationPaymentIntent } from "./cancellation-payment-attempt-service";

export async function waiveCancellationCharge(input: {
  organizationId: string;
  locationId: string | null;
  chargeId: string;
  actorUserId: string;
  reason: string | null;
}): Promise<typeof cancellationCharge.$inferSelect> {
  await cancelUnpaidCancellationPaymentIntent({
    organizationId: input.organizationId,
    locationId: input.locationId,
    chargeId: input.chargeId,
  });

  return db.transaction(async (tx) => {
    const [charge] = await tx
      .select()
      .from(cancellationCharge)
      .where(
        and(
          eq(cancellationCharge.id, input.chargeId),
          eq(cancellationCharge.organizationId, input.organizationId),
          exactCancellationLocation(
            cancellationCharge.locationId,
            input.locationId,
          ),
        ),
      )
      .limit(1)
      .for("update");
    if (!charge) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Cancellation charge not found.",
      });
    }
    if (charge.status === "WAIVED") return charge;
    if (!cancellationChargeCanWaive(charge.status)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "A fee that is processing or paid must be resolved through the payment refund flow.",
      });
    }

    const allocations = await tx
      .select({
        id: cancellationCreditAllocation.id,
        classCreditId: cancellationCreditAllocation.classCreditId,
        credits: cancellationCreditAllocation.credits,
      })
      .from(cancellationCreditAllocation)
      .where(
        and(
          eq(cancellationCreditAllocation.cancellationChargeId, charge.id),
          isNull(cancellationCreditAllocation.reversedAt),
        ),
      )
      .for("update");

    const allocatedCredits = allocations.reduce(
      (total, allocation) => total + allocation.credits,
      0,
    );
    if (allocatedCredits !== charge.creditsDeducted) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "This fee has legacy or incomplete credit allocation history and cannot be waived automatically.",
      });
    }

    if (allocations.length > 0) {
      const creditIds = allocations.map(
        (allocation) => allocation.classCreditId,
      );
      const credits = await tx
        .select({
          id: classCredit.id,
          usedCredits: classCredit.usedCredits,
        })
        .from(classCredit)
        .where(
          and(
            eq(classCredit.organizationId, input.organizationId),
            exactCancellationLocation(classCredit.locationId, input.locationId),
            inArray(classCredit.id, creditIds),
          ),
        )
        .for("update");
      if (credits.length !== creditIds.length) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The deducted class credits could not be restored safely.",
        });
      }

      const usedById = new Map(
        credits.map((credit) => [credit.id, credit.usedCredits]),
      );
      for (const allocation of allocations) {
        if (
          (usedById.get(allocation.classCreditId) ?? 0) < allocation.credits
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "The deducted class credits could not be restored safely.",
          });
        }
      }

      const values = allocations.map(
        (allocation) =>
          sql`(${allocation.classCreditId}::text, ${allocation.credits}::integer)`,
      );
      await tx.execute(sql`
        UPDATE "ClassCredit" AS credit
        SET
          "usedCredits" = credit."usedCredits" - reversal.credits,
          "updatedAt" = ${new Date()}
        FROM (VALUES ${sql.join(values, sql`, `)}) AS reversal(id, credits)
        WHERE credit."id" = reversal.id
      `);

      await tx
        .update(cancellationCreditAllocation)
        .set({
          reversedAt: new Date(),
          reversedBy: input.actorUserId,
        })
        .where(
          inArray(
            cancellationCreditAllocation.id,
            allocations.map((allocation) => allocation.id),
          ),
        );
    }

    if (charge.commerceOperationId) {
      await tx
        .update(commerceOperation)
        .set({
          status: "CANCELLED",
          completedAt: new Date(),
          failureCode: "CHARGE_WAIVED",
          failureMessage: "The cancellation charge was waived by an operator.",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(commerceOperation.id, charge.commerceOperationId),
            inArray(commerceOperation.status, [
              "CREATED",
              "REQUIRES_ACTION",
              "FAILED",
            ]),
          ),
        );
    }

    const [waived] = await tx
      .update(cancellationCharge)
      .set({
        status: "WAIVED",
        waived: true,
        waivedBy: input.actorUserId,
        waivedReason: input.reason,
        processedAt: new Date(),
        failureCode: null,
        failureMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(cancellationCharge.id, charge.id))
      .returning();
    if (!waived)
      throw new Error("Cancellation charge waiver was not persisted");
    return waived;
  });
}
