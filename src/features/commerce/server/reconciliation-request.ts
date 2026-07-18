import "server-only";

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { commerceReconciliationRun } from "@/db/schema";
import { RECEIPT_RECONCILIATION_PROVIDER } from "@/features/commerce/reconciliation-contracts";
import type { RequestedReconciliationRun } from "@/features/commerce/reconciliation-output-contracts";
import type { CommerceScope } from "@/features/commerce/server/reconciliation-list-helpers";
import { inngest } from "@/inngest/client";

export async function requestReceiptReconciliation(input: {
  scope: CommerceScope;
  actorId: string;
  windowStart: Date;
  windowEnd: Date;
}): Promise<RequestedReconciliationRun> {
  if (input.windowEnd.getTime() > Date.now() + 5 * 60 * 1_000) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The reconciliation window cannot end in the future.",
    });
  }

  const requested = await db.transaction(async (tx) => {
    const lockKey = [
      "commerce-reconciliation",
      input.scope.organizationId,
      input.scope.locationId ?? "organization",
      RECEIPT_RECONCILIATION_PROVIDER,
    ].join(":");
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const conditions: SQL[] = [
      eq(
        commerceReconciliationRun.organizationId,
        input.scope.organizationId,
      ),
      eq(
        commerceReconciliationRun.provider,
        RECEIPT_RECONCILIATION_PROVIDER,
      ),
      inArray(commerceReconciliationRun.status, ["PENDING", "RUNNING"]),
    ];
    conditions.push(
      input.scope.locationId
        ? eq(commerceReconciliationRun.locationId, input.scope.locationId)
        : isNull(commerceReconciliationRun.locationId),
    );

    const [inFlight] = await tx
      .select({
        id: commerceReconciliationRun.id,
        status: commerceReconciliationRun.status,
      })
      .from(commerceReconciliationRun)
      .where(and(...conditions))
      .orderBy(desc(commerceReconciliationRun.createdAt))
      .limit(1);

    if (inFlight) {
      return { ...inFlight, created: false };
    }

    const now = new Date();
    const [created] = await tx
      .insert(commerceReconciliationRun)
      .values({
        id: randomUUID(),
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        provider: RECEIPT_RECONCILIATION_PROVIDER,
        status: "PENDING",
        requestedBy: input.actorId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: commerceReconciliationRun.id,
        status: commerceReconciliationRun.status,
      });

    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create the reconciliation run.",
      });
    }
    return { ...created, created: true };
  });

  if (!requested.created && requested.status === "RUNNING") return requested;

  try {
    await inngest.send({
      id: requested.id,
      name: "commerce/reconciliation.requested",
      data: {
        runId: requested.id,
        organizationId: input.scope.organizationId,
      },
    });
  } catch (cause) {
    await db
      .update(commerceReconciliationRun)
      .set({
        errorMessage: "The reconciliation job could not be queued.",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(commerceReconciliationRun.id, requested.id),
          eq(
            commerceReconciliationRun.organizationId,
            input.scope.organizationId,
          ),
        ),
      );
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The reconciliation job could not be queued.",
      cause,
    });
  }

  await db
    .update(commerceReconciliationRun)
    .set({ errorMessage: null, updatedAt: new Date() })
    .where(
      and(
        eq(commerceReconciliationRun.id, requested.id),
        eq(commerceReconciliationRun.status, "PENDING"),
      ),
    );

  return requested;
}
