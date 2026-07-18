import "server-only";

import { createId } from "@paralleldrive/cuid2";
import {
  and,
  asc,
  eq,
  exists,
  inArray,
  isNull,
  lt,
  lte,
  notExists,
  or,
} from "drizzle-orm";

import { db } from "@/db";
import { deliveryAttempt, outboundDelivery, smsMessage } from "@/db/schema";
import { resolveDispatchOutcome } from "@/features/delivery/lib/dispatch-outcome";
import {
  isDeliveryChannel,
  type DeliveryChannel,
} from "@/features/delivery/contracts";
import {
  deliveryPayloadSchema,
  deliverySenderRefSchema,
} from "@/features/delivery/lib/payload-schemas";
import { recordCampaignDispatchOutcome } from "@/features/delivery/server/campaign-source";
import {
  findBlockingSuppressionInTransaction,
  type DeliveryTransaction,
} from "@/features/delivery/server/outbox";
import type { DeliveryDispatchResult } from "@/features/delivery/server/providers/provider";
import { getDeliveryProviderAdapter } from "@/features/delivery/server/providers/registry";
import { reconcilePendingResendEvents } from "@/features/delivery/server/resend-events";
import { projectInvoiceReminderDelivery } from "@/features/invoicing/server/invoice-reminder-delivery";
import { releaseSmsSpendReservation } from "@/features/communications/server/sms-spend-policy";

const DELIVERY_BATCH_SIZE = 20;
const DELIVERY_LEASE_MS = 2 * 60_000;
const PROVIDER_TIMEOUT_MS = 30_000;

type ClaimDeliveriesInput = {
  organizationId?: string;
  limit?: number;
  now?: Date;
};

export type ClaimedDelivery = {
  id: string;
  claimToken: string;
};

export async function claimDueDeliveries({
  organizationId,
  limit = DELIVERY_BATCH_SIZE,
  now = new Date(),
}: ClaimDeliveriesInput = {}): Promise<ClaimedDelivery[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  const claimToken = createId();
  const leaseExpiresAt = new Date(now.getTime() + DELIVERY_LEASE_MS);

  return db.transaction(async (tx) => {
    const dueWhere = and(
      eq(outboundDelivery.status, "QUEUED"),
      lte(outboundDelivery.availableAt, now),
      or(
        isNull(outboundDelivery.nextAttemptAt),
        lte(outboundDelivery.nextAttemptAt, now),
      ),
      organizationId
        ? eq(outboundDelivery.organizationId, organizationId)
        : undefined,
    );
    const candidates = await tx
      .select({ id: outboundDelivery.id })
      .from(outboundDelivery)
      .where(dueWhere)
      .orderBy(
        asc(outboundDelivery.availableAt),
        asc(outboundDelivery.createdAt),
      )
      .limit(boundedLimit);

    if (candidates.length === 0) {
      return [];
    }

    return tx
      .update(outboundDelivery)
      .set({
        status: "SENDING",
        claimToken,
        leaseExpiresAt,
        updatedAt: now,
      })
      .where(
        and(
          inArray(
            outboundDelivery.id,
            candidates.map((candidate) => candidate.id),
          ),
          dueWhere,
        ),
      )
      .returning({
        id: outboundDelivery.id,
        claimToken: outboundDelivery.claimToken,
      })
      .then((claimed) =>
        claimed.flatMap((delivery) =>
          delivery.claimToken
            ? [{ id: delivery.id, claimToken: delivery.claimToken }]
            : [],
        ),
      );
  });
}

async function syncLegacySource(
  tx: DeliveryTransaction,
  delivery: typeof outboundDelivery.$inferSelect,
  status: "ACCEPTED" | "FAILED" | "SUPPRESSED" | "UNKNOWN",
  errorCode?: string | null,
  errorMessage?: string | null,
): Promise<void> {
  await projectInvoiceReminderDelivery(tx, delivery);

  if (delivery.sourceType === "SMS_MESSAGE") {
    await tx
      .update(smsMessage)
      .set({
        status:
          status === "ACCEPTED"
            ? "SENT"
            : status === "FAILED" || status === "SUPPRESSED"
              ? "FAILED"
              : "QUEUED",
        providerSid:
          status === "ACCEPTED" ? delivery.providerMessageId : undefined,
        sentAt: status === "ACCEPTED" ? new Date() : undefined,
        errorCode: errorCode ?? undefined,
        errorMessage: errorMessage ?? undefined,
      })
      .where(eq(smsMessage.deliveryId, delivery.id));
  }

  if (delivery.sourceType === "CAMPAIGN_RECIPIENT") {
    await recordCampaignDispatchOutcome(tx, delivery.id, status, errorCode);
  }
}

async function suppressClaimedDelivery(
  tx: DeliveryTransaction,
  delivery: Omit<typeof outboundDelivery.$inferSelect, "channel"> & {
    channel: DeliveryChannel;
  },
  claimToken: string,
): Promise<boolean> {
  const suppression = await findBlockingSuppressionInTransaction(tx, {
    organizationId: delivery.organizationId,
    locationId: delivery.locationId,
    clientId: delivery.clientId,
    channel: delivery.channel,
    purpose: delivery.purpose,
    destinationNormalized: delivery.destinationNormalized,
  });
  if (!suppression) {
    return false;
  }

  const [suppressed] = await tx
    .update(outboundDelivery)
    .set({
      status: "SUPPRESSED",
      claimToken: null,
      leaseExpiresAt: null,
      lastErrorCode: suppression.reason,
      lastErrorMessage:
        "Delivery blocked by an active communication suppression",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(outboundDelivery.id, delivery.id),
        eq(outboundDelivery.claimToken, claimToken),
        eq(outboundDelivery.status, "SENDING"),
      ),
    )
    .returning();

  if (suppressed) {
    if (delivery.provider === "TWILIO" && delivery.channel === "SMS") {
      await releaseSmsSpendReservation({
        tx,
        organizationId: delivery.organizationId,
        deliveryId: delivery.id,
        reason: "SUPPRESSED",
        at: new Date(),
      });
    }
    await syncLegacySource(
      tx,
      suppressed,
      "SUPPRESSED",
      suppression.reason,
      "Delivery suppressed",
    );
  }
  return Boolean(suppressed);
}

function invalidContractResult(message: string): DeliveryDispatchResult {
  return { kind: "terminal", code: "INVALID_DELIVERY_CONTRACT", message };
}

export async function dispatchClaimedDelivery(
  deliveryId: string,
  claimToken: string,
): Promise<{ deliveryId: string; status: string }> {
  const delivery = await db.query.outboundDelivery.findFirst({
    where: and(
      eq(outboundDelivery.id, deliveryId),
      eq(outboundDelivery.claimToken, claimToken),
      eq(outboundDelivery.status, "SENDING"),
    ),
  });
  if (!delivery) {
    return { deliveryId, status: "NOT_CLAIMED" };
  }

  const deliveryChannel = isDeliveryChannel(delivery.channel)
    ? delivery.channel
    : null;
  const suppressed = deliveryChannel
    ? await db.transaction((tx) =>
        suppressClaimedDelivery(
          tx,
          { ...delivery, channel: deliveryChannel },
          claimToken,
        ),
      )
    : false;
  if (suppressed) {
    return { deliveryId, status: "SUPPRESSED" };
  }

  const payload = deliveryPayloadSchema.safeParse(delivery.payload);
  const sender = deliverySenderRefSchema.safeParse(delivery.senderRef);
  const adapter = getDeliveryProviderAdapter(delivery.provider);
  const attemptNumber = delivery.attemptCount + 1;
  const attemptId = createId();
  const startedAt = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(deliveryAttempt).values({
      id: attemptId,
      deliveryId: delivery.id,
      organizationId: delivery.organizationId,
      locationId: delivery.locationId,
      attemptNumber,
      claimToken,
      provider: delivery.provider,
      startedAt,
    });
    await tx
      .update(outboundDelivery)
      .set({ attemptCount: attemptNumber, updatedAt: startedAt })
      .where(
        and(
          eq(outboundDelivery.id, delivery.id),
          eq(outboundDelivery.claimToken, claimToken),
          eq(outboundDelivery.status, "SENDING"),
        ),
      );
  });

  let result: DeliveryDispatchResult;
  if (!deliveryChannel) {
    result = invalidContractResult(
      "Voice calls must use the dedicated voice-call runtime",
    );
  } else if (!payload.success) {
    result = invalidContractResult("Stored delivery payload is invalid");
  } else if (!sender.success) {
    result = invalidContractResult("Stored sender reference is invalid");
  } else if (!adapter || !adapter.channels.includes(deliveryChannel)) {
    result = {
      kind: "terminal",
      code: "PROVIDER_ADAPTER_UNAVAILABLE",
      message: "No provider adapter supports this delivery",
    };
  } else {
    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      PROVIDER_TIMEOUT_MS,
    );
    try {
      result = await adapter.send(
        {
          deliveryId: delivery.id,
          organizationId: delivery.organizationId,
          locationId: delivery.locationId,
          idempotencyKey: delivery.idempotencyKey,
          purpose: delivery.purpose,
          providerAccountId: delivery.providerAccountId,
          providerAccountRef: delivery.providerAccountRef,
          destination: delivery.destinationNormalized,
          sender: sender.data,
          payload: payload.data,
        },
        abortController.signal,
      );
    } catch (error) {
      result = {
        kind: "ambiguous",
        code: "UNHANDLED_PROVIDER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Provider adapter failed with an unknown error",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  const completedAt = new Date();
  const mutation = resolveDispatchOutcome({
    result,
    provider: delivery.provider,
    attemptNumber,
    maxAttempts: delivery.maxAttempts,
    completedAt,
  });

  const updated = await db.transaction(async (tx) => {
    await tx
      .update(deliveryAttempt)
      .set({
        outcome: mutation.attemptOutcome,
        providerMessageId: mutation.providerMessageId,
        providerRequestId: mutation.providerRequestId,
        errorClass: mutation.failureClass,
        errorCode: mutation.errorCode,
        errorMessage: mutation.errorMessage,
        retryAfter: mutation.nextAttemptAt,
        completedAt,
      })
      .where(eq(deliveryAttempt.id, attemptId));

    const [updatedDelivery] = await tx
      .update(outboundDelivery)
      .set({
        status: mutation.status,
        providerMessageId: mutation.providerMessageId ?? undefined,
        providerRequestId: mutation.providerRequestId ?? undefined,
        lastFailureClass: mutation.failureClass,
        lastErrorCode: mutation.errorCode,
        lastErrorMessage: mutation.errorMessage,
        acceptedAt: mutation.acceptedAt ?? undefined,
        deliveredAt: mutation.deliveredAt ?? undefined,
        nextAttemptAt: mutation.nextAttemptAt,
        claimToken: mutation.status === "UNKNOWN" ? claimToken : null,
        leaseExpiresAt: null,
        updatedAt: completedAt,
      })
      .where(
        and(
          eq(outboundDelivery.id, delivery.id),
          eq(outboundDelivery.claimToken, claimToken),
          or(
            eq(outboundDelivery.status, "SENDING"),
            eq(outboundDelivery.status, "UNKNOWN"),
          ),
        ),
      )
      .returning();

    if (!updatedDelivery) {
      return null;
    }

    const sourceStatus =
      mutation.status === "ACCEPTED" || mutation.status === "DELIVERED"
        ? "ACCEPTED"
        : mutation.status === "DEAD_LETTER"
          ? "FAILED"
          : mutation.status === "UNKNOWN"
            ? "UNKNOWN"
            : null;
    if (sourceStatus) {
      await syncLegacySource(
        tx,
        updatedDelivery,
        sourceStatus,
        mutation.errorCode,
        mutation.errorMessage,
      );
    }
    if (
      updatedDelivery.provider === "TWILIO" &&
      updatedDelivery.channel === "SMS" &&
      mutation.status === "DEAD_LETTER"
    ) {
      await releaseSmsSpendReservation({
        tx,
        organizationId: updatedDelivery.organizationId,
        deliveryId: updatedDelivery.id,
        reason: mutation.errorCode ?? "DEAD_LETTER",
        at: completedAt,
      });
    }

    return updatedDelivery;
  });

  if (
    updated?.provider === "RESEND" &&
    updated.providerAccountId &&
    updated.providerMessageId
  ) {
    try {
      await reconcilePendingResendEvents(
        updated.providerAccountId,
        updated.providerMessageId,
      );
    } catch (error) {
      console.error("Failed to reconcile pending Resend events", {
        deliveryId: updated.id,
        error: error instanceof Error ? error.message : "Unknown event error",
      });
    }
  }

  return { deliveryId, status: updated?.status ?? "RACE_LOST" };
}

export async function dispatchDueDeliveryBatch(
  organizationId?: string,
): Promise<{ claimed: number; remainingLikely: boolean }> {
  const claimed = await claimDueDeliveries({ organizationId });
  await Promise.all(
    claimed.map((delivery) =>
      dispatchClaimedDelivery(delivery.id, delivery.claimToken),
    ),
  );
  return {
    claimed: claimed.length,
    remainingLikely: claimed.length === DELIVERY_BATCH_SIZE,
  };
}

export async function recoverExpiredDeliveryLeases(
  now: Date = new Date(),
): Promise<{ requeued: number; unknown: number }> {
  return db.transaction(async (tx) => {
    const incompleteAttempt = tx
      .select({ id: deliveryAttempt.id })
      .from(deliveryAttempt)
      .where(
        and(
          eq(deliveryAttempt.deliveryId, outboundDelivery.id),
          eq(deliveryAttempt.claimToken, outboundDelivery.claimToken),
          isNull(deliveryAttempt.completedAt),
        ),
      );
    const expiredWhere = and(
      eq(outboundDelivery.status, "SENDING"),
      lt(outboundDelivery.leaseExpiresAt, now),
    );

    const requeued = await tx
      .update(outboundDelivery)
      .set({
        status: "QUEUED",
        claimToken: null,
        leaseExpiresAt: null,
        nextAttemptAt: now,
        updatedAt: now,
      })
      .where(and(expiredWhere, notExists(incompleteAttempt)))
      .returning({ id: outboundDelivery.id });

    const unknown = await tx
      .update(outboundDelivery)
      .set({
        status: "UNKNOWN",
        leaseExpiresAt: null,
        lastFailureClass: "AMBIGUOUS",
        lastErrorCode: "LEASE_EXPIRED_DURING_ATTEMPT",
        lastErrorMessage:
          "Delivery lease expired while a provider attempt was active",
        updatedAt: now,
      })
      .where(and(expiredWhere, exists(incompleteAttempt)))
      .returning();

    if (unknown.length > 0) {
      await tx
        .update(deliveryAttempt)
        .set({
          outcome: "AMBIGUOUS",
          errorClass: "AMBIGUOUS",
          errorCode: "LEASE_EXPIRED_DURING_ATTEMPT",
          errorMessage:
            "Provider attempt did not complete before its delivery lease expired",
          completedAt: now,
        })
        .where(
          and(
            inArray(
              deliveryAttempt.deliveryId,
              unknown.map((delivery) => delivery.id),
            ),
            isNull(deliveryAttempt.completedAt),
          ),
        );

      for (const delivery of unknown) {
        await syncLegacySource(
          tx,
          delivery,
          "UNKNOWN",
          "LEASE_EXPIRED_DURING_ATTEMPT",
          "Provider attempt did not complete before its delivery lease expired",
        );
      }
    }

    return { requeued: requeued.length, unknown: unknown.length };
  });
}
