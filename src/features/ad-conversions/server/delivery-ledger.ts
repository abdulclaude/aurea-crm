import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { adConversionDelivery, providerAccount } from "@/db/schema";
import { isAdConversionDeliveryClaimable } from "@/features/ad-conversions/lib/delivery-claim-policy";
import type { ResolvedAdConversionAccount } from "./provider-account-resolver";

export type ProviderDeliveryResult = {
  success: boolean;
  providerEventId: string;
  errorCode?: string;
};

export type AdConversionLedgerScope = {
  organizationId: string;
  locationId: string | null;
};

export async function claimAdConversionDelivery(input: {
  scope: AdConversionLedgerScope;
  eventId: string;
  account: ResolvedAdConversionAccount;
}): Promise<string | null> {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(adConversionDelivery)
      .values({
        id: createId(),
        eventId: input.eventId,
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        providerAccountId: input.account.id,
        provider: input.account.provider,
        status: "PROCESSING",
        attemptCount: 1,
        lastAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [
          adConversionDelivery.eventId,
          adConversionDelivery.providerAccountId,
        ],
      })
      .returning({ id: adConversionDelivery.id });
    if (inserted) return inserted.id;

    const [existing] = await tx
      .select({
        id: adConversionDelivery.id,
        status: adConversionDelivery.status,
        lastAttemptAt: adConversionDelivery.lastAttemptAt,
      })
      .from(adConversionDelivery)
      .where(
        and(
          eq(adConversionDelivery.eventId, input.eventId),
          eq(adConversionDelivery.providerAccountId, input.account.id),
          eq(
            adConversionDelivery.organizationId,
            input.scope.organizationId,
          ),
          input.scope.locationId
            ? eq(adConversionDelivery.locationId, input.scope.locationId)
            : isNull(adConversionDelivery.locationId),
        ),
      )
      .limit(1)
      .for("update");
    if (
      !existing ||
      !isAdConversionDeliveryClaimable({
        status: existing.status,
        lastAttemptAt: existing.lastAttemptAt,
        now,
      })
    ) {
      return null;
    }
    await tx
      .update(adConversionDelivery)
      .set({
        status: "PROCESSING",
        attemptCount: sql`${adConversionDelivery.attemptCount} + 1`,
        lastAttemptAt: now,
        lastErrorCode: null,
        updatedAt: now,
      })
      .where(eq(adConversionDelivery.id, existing.id));
    return existing.id;
  });
}

export async function recordAdConversionDeliveryResult(input: {
  deliveryId: string;
  scope: AdConversionLedgerScope;
  account: ResolvedAdConversionAccount;
  result: ProviderDeliveryResult;
}): Promise<void> {
  const now = new Date();
  const errorCode = input.result.errorCode?.slice(0, 128) ?? null;
  await db.transaction(async (tx) => {
    const [updatedDelivery] = await tx
      .update(adConversionDelivery)
      .set({
        status: input.result.success ? "SUCCEEDED" : "FAILED",
        providerEventId: input.result.providerEventId,
        lastErrorCode: errorCode,
        succeededAt: input.result.success ? now : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(adConversionDelivery.id, input.deliveryId),
          eq(
            adConversionDelivery.organizationId,
            input.scope.organizationId,
          ),
          input.scope.locationId
            ? eq(adConversionDelivery.locationId, input.scope.locationId)
            : isNull(adConversionDelivery.locationId),
          eq(
            adConversionDelivery.organizationId,
            input.account.organizationId,
          ),
          eq(adConversionDelivery.providerAccountId, input.account.id),
          eq(adConversionDelivery.provider, input.account.provider),
        ),
      )
      .returning({ id: adConversionDelivery.id });
    if (!updatedDelivery) {
      throw new Error("Ad conversion delivery account scope changed.");
    }

    const [updatedAccount] = await tx
      .update(providerAccount)
      .set({
        lastHealthCheckAt: now,
        lastSuccessAt: input.result.success ? now : undefined,
        lastErrorCode: errorCode,
        updatedAt: now,
      })
      .where(
        and(
          eq(providerAccount.id, input.account.id),
          eq(providerAccount.organizationId, input.account.organizationId),
          input.account.locationId
            ? eq(providerAccount.locationId, input.account.locationId)
            : isNull(providerAccount.locationId),
          eq(providerAccount.provider, input.account.provider),
        ),
      )
      .returning({ id: providerAccount.id });
    if (!updatedAccount) {
      throw new Error("Ad conversion provider account scope changed.");
    }
  });
}
