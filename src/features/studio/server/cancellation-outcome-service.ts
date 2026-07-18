import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import {
  cancellationCharge,
  cancellationPolicy,
  client,
  studioBooking,
} from "@/db/schema";
import {
  currencyExponent,
  decimalToMinorUnits,
} from "@/features/commerce/lib/money";

import { exactCancellationLocation } from "./cancellation-access";
import { deductCreditsForCreatedCharges } from "./cancellation-credit-allocation-service";
import { normalizeCancellationCurrency } from "./cancellation-policy-input";
import {
  loadApplicableCancellationPolicies,
  loadScopedCancellationBookings,
} from "./cancellation-outcome-queries";

export type CancellationOutcome = "NO_SHOW" | "LATE_CANCEL";

export type CancellationOutcomeResult = {
  updated: number;
  charges: Array<typeof cancellationCharge.$inferSelect>;
  autoCollectChargeIds: string[];
  workflowEvents: Array<{
    bookingId: string;
    clientId: string;
    classId: string;
    clientName: string;
    clientEmail: string | null;
    className: string;
    classStartTime: Date;
    locationId: string | null;
    sendNotification: boolean;
  }>;
};

export async function applyCancellationOutcome(input: {
  organizationId: string;
  locationId: string | null;
  bookingIds: string[];
  outcome: CancellationOutcome;
  requirePolicy?: boolean;
}): Promise<CancellationOutcomeResult> {
  const bookingIds = [...new Set(input.bookingIds)];
  const now = new Date();

  return db.transaction(async (tx) => {
    const bookings = await loadScopedCancellationBookings(tx, {
      organizationId: input.organizationId,
      locationId: input.locationId,
      bookingIds,
    });
    if (bookings.length !== bookingIds.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "One or more bookings were not found in this workspace.",
      });
    }

    for (const booking of bookings) {
      const allowedStatuses =
        input.outcome === "NO_SHOW"
          ? ["BOOKED", "NO_SHOW"]
          : ["BOOKED", "CANCELLED", "LATE_CANCEL"];
      if (!allowedStatuses.includes(booking.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${booking.clientName}'s booking cannot be marked ${input.outcome.toLowerCase().replace("_", " ")} from its current status.`,
        });
      }
    }

    const policies = await loadApplicableCancellationPolicies(tx, {
      organizationId: input.organizationId,
      locationId: input.locationId,
      explicitIds: bookings
        .map((booking) => booking.cancellationPolicyId)
        .filter((id): id is string => Boolean(id)),
    });
    const policyById = new Map(policies.map((policy) => [policy.id, policy]));
    const defaultPolicy = policies.find(
      (policy) => policy.isDefault && policy.isActive,
    );

    const policyByBooking = new Map<
      string,
      (typeof policies)[number] | undefined
    >();
    for (const booking of bookings) {
      const policy = booking.cancellationPolicyId
        ? policyById.get(booking.cancellationPolicyId)
        : defaultPolicy;
      if (booking.cancellationPolicyId && !policy) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "A class references a cancellation policy outside this workspace.",
        });
      }
      if (input.requirePolicy && !policy) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Configure an active cancellation policy before applying a fee.",
        });
      }
      policyByBooking.set(booking.bookingId, policy);
    }

    if (input.outcome === "NO_SHOW") {
      await tx
        .update(client)
        .set({ currentStreak: 0, updatedAt: now })
        .where(
          and(
            eq(client.organizationId, input.organizationId),
            exactCancellationLocation(client.locationId, input.locationId),
            inArray(
              client.id,
              bookings.map((booking) => booking.clientId),
            ),
          ),
        );
    }

    await tx
      .update(studioBooking)
      .set({
        status: input.outcome,
        cancelledAt: input.outcome === "LATE_CANCEL" ? now : null,
        updatedAt: now,
      })
      .where(inArray(studioBooking.id, bookingIds));

    const chargeValues = bookings.flatMap((booking) => {
      const policy = policyByBooking.get(booking.bookingId);
      if (!policy) return [];
      const amount =
        input.outcome === "NO_SHOW"
          ? policy.noShowFeeAmount
          : policy.lateCancelFee;
      const currency = normalizeCancellationCurrency(policy.currency);
      const amountMinor = decimalToMinorUnits(
        amount,
        currencyExponent(currency),
      );
      if (amountMinor < 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The cancellation policy contains an invalid fee amount.",
        });
      }

      return [
        {
          id: createId(),
          organizationId: input.organizationId,
          locationId: input.locationId,
          clientId: booking.clientId,
          classId: booking.classId,
          bookingId: booking.bookingId,
          policyId: policy.id,
          type: input.outcome,
          status:
            amountMinor === 0
              ? ("NO_PAYMENT_DUE" as const)
              : ("PENDING" as const),
          amount,
          currency,
          creditsDeducted: 0,
          processedAt: amountMinor === 0 ? now : null,
          createdAt: now,
          updatedAt: now,
        },
      ];
    });

    const createdCharges =
      chargeValues.length > 0
        ? await tx
            .insert(cancellationCharge)
            .values(chargeValues)
            .onConflictDoNothing({
              target: [cancellationCharge.bookingId, cancellationCharge.type],
            })
            .returning()
        : [];

    await deductCreditsForCreatedCharges(tx, {
      organizationId: input.organizationId,
      locationId: input.locationId,
      charges: createdCharges,
      policyByBooking,
      now,
    });

    const charges =
      chargeValues.length > 0
        ? await tx.query.cancellationCharge.findMany({
            where: and(
              eq(cancellationCharge.organizationId, input.organizationId),
              exactCancellationLocation(
                cancellationCharge.locationId,
                input.locationId,
              ),
              inArray(cancellationCharge.bookingId, bookingIds),
              eq(cancellationCharge.type, input.outcome),
            ),
          })
        : [];

    return {
      updated: bookings.length,
      charges,
      autoCollectChargeIds: charges
        .filter((charge) => {
          const policy = policyByBooking.get(charge.bookingId);
          return charge.status === "PENDING" && policy?.chargeCard === true;
        })
        .map((charge) => charge.id),
      workflowEvents: bookings.map((booking) => ({
        bookingId: booking.bookingId,
        clientId: booking.clientId,
        classId: booking.classId,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        className: booking.className,
        classStartTime: booking.classStartTime,
        locationId: booking.locationId,
        sendNotification:
          policyByBooking.get(booking.bookingId)?.sendNotification ?? true,
      })),
    };
  });
}
