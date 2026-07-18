import "server-only";

import { randomUUID } from "crypto";
import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";

import { db } from "@/db";
import { stripeEvent } from "@/db/schema";
import { stripeRetryDelayMs } from "@/features/commerce/lib/stripe-retry-policy";
import type { WaitlistOffer } from "@/features/studio/server/waitlist-offer-service";
import { dispatchWaitlistSpotOpened } from "@/features/studio/server/waitlist-workflow-dispatch";
import { decrypt, encrypt } from "@/lib/encryption";

import {
  getStripeObjectIdentity,
  parseStoredStripeEvent,
  PermanentStripeEventError,
  redactedErrorMessage,
  stripePayloadHash,
  type StripeEventEnvelope,
} from "./stripe-event-contract";

export type CommerceTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export type StripeEventHandlerResult = {
  outcome: "PROCESSED" | "IGNORED";
  organizationId?: string | null;
  locationId?: string | null;
  stripeConnectionId?: string | null;
  instructorId?: string | null;
  waitlistOffer?: WaitlistOffer | null;
};

export type StripeEventProcessor = (input: {
  tx: CommerceTransaction;
  event: StripeEventEnvelope;
  receiptId: string;
}) => Promise<StripeEventHandlerResult>;

type ReceiptResult = {
  receiptId: string;
  duplicate: boolean;
  status: typeof stripeEvent.$inferSelect.status;
};

type ProcessingResult = {
  status: "PROCESSED" | "IGNORED" | "FAILED" | "DEAD_LETTER";
  duplicate: boolean;
  retryable: boolean;
};

const PAYLOAD_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function persistStripeEventReceipt(input: {
  event: StripeEventEnvelope;
  rawBody: string;
  source: string;
}): Promise<ReceiptResult> {
  const identity = getStripeObjectIdentity(input.event.dataObject);
  const now = new Date();
  const payloadHash = stripePayloadHash(input.rawBody);
  const [created] = await db
    .insert(stripeEvent)
    .values({
      id: randomUUID(),
      stripeEventId: input.event.id,
      type: input.event.type,
      status: "RECEIVED",
      source: input.source,
      stripeAccountId: input.event.accountId,
      apiVersion: input.event.apiVersion,
      livemode: input.event.livemode,
      objectId: identity.objectId,
      objectType: identity.objectType,
      payloadHash,
      encryptedPayload: encrypt(input.rawBody),
      payloadExpiresAt: new Date(now.getTime() + PAYLOAD_RETENTION_MS),
      receivedAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: stripeEvent.stripeEventId,
    })
    .returning({ id: stripeEvent.id, status: stripeEvent.status });

  if (created) {
    return { receiptId: created.id, duplicate: false, status: created.status };
  }

  const existing = await db.query.stripeEvent.findFirst({
    where: eq(stripeEvent.stripeEventId, input.event.id),
    columns: {
      id: true,
      status: true,
      type: true,
      stripeAccountId: true,
      source: true,
      payloadHash: true,
    },
  });

  if (!existing) {
    throw new Error("Stripe event receipt conflict could not be resolved");
  }
  if (
    existing.type !== input.event.type ||
    existing.stripeAccountId !== input.event.accountId ||
    (existing.payloadHash !== null && existing.payloadHash !== payloadHash)
  ) {
    throw new PermanentStripeEventError(
      "STRIPE_EVENT_ID_CONFLICT",
      "A Stripe event identifier was replayed with different signed content",
    );
  }

  return {
    receiptId: existing.id,
    duplicate: true,
    status: existing.status,
  };
}

export async function processStripeEventReceipt(input: {
  receiptId: string;
  event: StripeEventEnvelope;
  processor: StripeEventProcessor;
}): Promise<ProcessingResult> {
  try {
    const result = await db.transaction(async (tx) => {
      const [receipt] = await tx
        .select({
          id: stripeEvent.id,
          status: stripeEvent.status,
          attempts: stripeEvent.attempts,
          maxAttempts: stripeEvent.maxAttempts,
          nextAttemptAt: stripeEvent.nextAttemptAt,
        })
        .from(stripeEvent)
        .where(eq(stripeEvent.id, input.receiptId))
        .for("update");

      if (!receipt) {
        throw new PermanentStripeEventError(
          "RECEIPT_NOT_FOUND",
          "Stripe event receipt was not found",
        );
      }

      if (receipt.status === "PROCESSED" || receipt.status === "IGNORED") {
        return {
          status: receipt.status,
          duplicate: true,
          retryable: false,
          waitlistOffer: null,
        } as const;
      }

      if (
        receipt.status === "DEAD_LETTER" ||
        receipt.attempts >= receipt.maxAttempts
      ) {
        await tx
          .update(stripeEvent)
          .set({
            status: "DEAD_LETTER",
            nextAttemptAt: null,
            updatedAt: new Date(),
          })
          .where(eq(stripeEvent.id, receipt.id));
        return {
          status: "DEAD_LETTER",
          duplicate: true,
          retryable: false,
          waitlistOffer: null,
        } as const;
      }

      if (receipt.nextAttemptAt && receipt.nextAttemptAt > new Date()) {
        return {
          status: "FAILED",
          duplicate: true,
          retryable: true,
          waitlistOffer: null,
        } as const;
      }

      const attempt = receipt.attempts + 1;
      await tx
        .update(stripeEvent)
        .set({
          status: "PROCESSING",
          attempts: attempt,
          lastAttemptAt: new Date(),
          nextAttemptAt: null,
          errorCode: null,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(stripeEvent.id, receipt.id));

      const handled = await input.processor({
        tx,
        event: input.event,
        receiptId: receipt.id,
      });
      const processedAt = new Date();

      await tx
        .update(stripeEvent)
        .set({
          status: handled.outcome,
          organizationId: handled.organizationId ?? null,
          locationId: handled.locationId ?? null,
          stripeConnectionId: handled.stripeConnectionId ?? null,
          instructorId: handled.instructorId ?? null,
          processedAt,
          updatedAt: processedAt,
        })
        .where(eq(stripeEvent.id, receipt.id));

      return {
        status: handled.outcome,
        duplicate: false,
        retryable: false,
        waitlistOffer: handled.waitlistOffer ?? null,
      } as const;
    });

    if (result.waitlistOffer) {
      await dispatchWaitlistSpotOpened({
        organizationId: result.waitlistOffer.organizationId,
        locationId: result.waitlistOffer.locationId,
        waitlistId: result.waitlistOffer.id,
        clientId: result.waitlistOffer.clientId,
        classId: result.waitlistOffer.classId,
        notifiedAt: result.waitlistOffer.notifiedAt,
      });
    }
    return {
      status: result.status,
      duplicate: result.duplicate,
      retryable: result.retryable,
    };
  } catch (error) {
    const permanent = error instanceof PermanentStripeEventError;
    const failed = await db.transaction(async (tx) => {
      const [receipt] = await tx
        .select({
          attempts: stripeEvent.attempts,
          maxAttempts: stripeEvent.maxAttempts,
        })
        .from(stripeEvent)
        .where(eq(stripeEvent.id, input.receiptId))
        .for("update");
      if (!receipt) return null;

      const attempts = receipt.attempts + 1;
      const deadLetter = permanent || attempts >= receipt.maxAttempts;
      await tx
        .update(stripeEvent)
        .set({
          status: deadLetter ? "DEAD_LETTER" : "FAILED",
          attempts,
          lastAttemptAt: new Date(),
          errorCode: permanent ? error.code : "PROCESSING_FAILED",
          errorMessage: redactedErrorMessage(error),
          nextAttemptAt: deadLetter
            ? null
            : new Date(
                Date.now() + stripeRetryDelayMs(input.receiptId, attempts),
              ),
          updatedAt: new Date(),
        })
        .where(eq(stripeEvent.id, input.receiptId));
      return { deadLetter };
    });

    if (failed?.deadLetter) {
      return { status: "DEAD_LETTER", duplicate: false, retryable: false };
    }

    return {
      status: permanent ? "DEAD_LETTER" : "FAILED",
      duplicate: false,
      retryable: !permanent,
    };
  }
}

export async function listRetryableStripeEventIds(
  limit = 50,
): Promise<string[]> {
  const now = new Date();
  const rows = await db
    .select({ id: stripeEvent.id })
    .from(stripeEvent)
    .where(
      and(
        inArray(stripeEvent.status, ["RECEIVED", "FAILED"]),
        or(
          isNull(stripeEvent.nextAttemptAt),
          lte(stripeEvent.nextAttemptAt, now),
        ),
      ),
    )
    .limit(limit);

  return rows.map((row) => row.id);
}

export async function loadStripeEventForReplay(
  receiptId: string,
): Promise<StripeEventEnvelope> {
  const receipt = await db.query.stripeEvent.findFirst({
    where: eq(stripeEvent.id, receiptId),
    columns: {
      encryptedPayload: true,
      payloadExpiresAt: true,
    },
  });

  if (!receipt?.encryptedPayload) {
    throw new PermanentStripeEventError(
      "PAYLOAD_UNAVAILABLE",
      "The retained Stripe payload is unavailable",
    );
  }
  if (receipt.payloadExpiresAt && receipt.payloadExpiresAt <= new Date()) {
    throw new PermanentStripeEventError(
      "PAYLOAD_EXPIRED",
      "The retained Stripe payload has expired",
    );
  }

  return parseStoredStripeEvent(decrypt(receipt.encryptedPayload));
}

export async function purgeExpiredStripePayloads(limit = 500): Promise<number> {
  const expired = await db
    .select({ id: stripeEvent.id })
    .from(stripeEvent)
    .where(
      and(
        lte(stripeEvent.payloadExpiresAt, new Date()),
        inArray(stripeEvent.status, ["PROCESSED", "IGNORED", "DEAD_LETTER"]),
      ),
    )
    .limit(limit);
  if (expired.length === 0) return 0;

  await db
    .update(stripeEvent)
    .set({ encryptedPayload: null, updatedAt: new Date() })
    .where(
      inArray(
        stripeEvent.id,
        expired.map((row) => row.id),
      ),
    );
  return expired.length;
}

export async function markStripeEventDeadLetter(input: {
  receiptId: string;
  error: PermanentStripeEventError;
}): Promise<void> {
  await db
    .update(stripeEvent)
    .set({
      status: "DEAD_LETTER",
      errorCode: input.error.code,
      errorMessage: redactedErrorMessage(input.error),
      nextAttemptAt: null,
      updatedAt: new Date(),
    })
    .where(eq(stripeEvent.id, input.receiptId));
}
