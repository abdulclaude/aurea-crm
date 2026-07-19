import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/db";
import {
  communicationWebhookReceipt,
  outboundDelivery,
} from "@/db/schema";
import { resendWebhookEventSchema } from "@/features/delivery/lib/resend-event-contract";
import { recordResendProviderEvent } from "@/features/delivery/server/resend-events";
import { resendReceivingEmailSchema } from "@/features/inbox/server/inbound-contracts";
import {
  recordResendInboundReceipt,
  requestInboundReceiptProcessing,
  resolveManagedResendInboundScope,
} from "@/features/inbox/server/inbound-receipts";
import { decrypt, encrypt } from "@/lib/encryption";
import { inngest } from "@/inngest/client";
import { getPlatformResendApiCredentials } from "./platform-credentials";

const RECEIPT_LEASE_MS = 2 * 60_000;
const MAX_ATTEMPTS = 8;

export async function recordManagedResendWebhook(input: {
  providerEventId: string;
  payloadHash: string;
  rawBody: string;
  eventType: string;
  providerResourceId: string;
  occurredAt: Date;
}): Promise<{ receiptId: string; duplicate: boolean }> {
  const [created] = await db
    .insert(communicationWebhookReceipt)
    .values({
      id: createId(),
      provider: "RESEND",
      providerAccountRef: "resend:platform",
      eventType: input.eventType,
      providerEventId: input.providerEventId,
      providerResourceId: input.providerResourceId,
      payloadHash: input.payloadHash,
      encryptedPayload: encrypt(input.rawBody),
      occurredAt: input.occurredAt,
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: communicationWebhookReceipt.id });
  if (created) return { receiptId: created.id, duplicate: false };
  const [existing] = await db
    .select({ id: communicationWebhookReceipt.id })
    .from(communicationWebhookReceipt)
    .where(
      and(
        eq(communicationWebhookReceipt.provider, "RESEND"),
        eq(
          communicationWebhookReceipt.providerAccountRef,
          "resend:platform",
        ),
        eq(communicationWebhookReceipt.eventType, input.eventType),
        eq(
          communicationWebhookReceipt.providerEventId,
          input.providerEventId,
        ),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Verified Resend receipt could not be stored.");
  return { receiptId: existing.id, duplicate: true };
}

export async function requestManagedResendReceiptProcessing(
  receiptId: string,
): Promise<void> {
  await inngest.send({
    name: "communications/resend-webhook.received",
    id: `communications-resend-webhook:${receiptId}`,
    data: { receiptId },
  });
}

async function claimReceipt(receiptId: string) {
  const now = new Date();
  const claimToken = createId();
  const [claimed] = await db
    .update(communicationWebhookReceipt)
    .set({
      status: "PROCESSING",
      claimToken,
      leaseExpiresAt: new Date(now.getTime() + RECEIPT_LEASE_MS),
      attemptCount: sql`${communicationWebhookReceipt.attemptCount} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(communicationWebhookReceipt.id, receiptId),
        or(
          inArray(communicationWebhookReceipt.status, ["PENDING", "FAILED"]),
          and(
            eq(communicationWebhookReceipt.status, "PROCESSING"),
            lt(communicationWebhookReceipt.leaseExpiresAt, now),
          ),
        ),
      ),
    )
    .returning();
  return claimed?.claimToken ? { ...claimed, claimToken } : null;
}

async function complete(
  receiptId: string,
  claimToken: string,
  values: Partial<typeof communicationWebhookReceipt.$inferInsert>,
) {
  await db
    .update(communicationWebhookReceipt)
    .set({
      ...values,
      claimToken: null,
      leaseExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(communicationWebhookReceipt.id, receiptId),
        eq(communicationWebhookReceipt.claimToken, claimToken),
      ),
    );
}

export async function processManagedResendReceipt(
  receiptId: string,
): Promise<{ status: string }> {
  const receipt = await claimReceipt(receiptId);
  if (!receipt) return { status: "NOT_CLAIMED" };
  try {
    const event = resendWebhookEventSchema.parse(
      JSON.parse(decrypt(receipt.encryptedPayload)) as unknown,
    );
    if (event.type === "email.received") {
      const credentials = getPlatformResendApiCredentials();
      const response = await new Resend(credentials.apiKey).emails.receiving.get(
        event.data.email_id,
      );
      if (response.error || !response.data) {
        throw new Error(
          response.error?.message ?? "Resend did not return the inbound email.",
        );
      }
      const email = resendReceivingEmailSchema.parse(response.data);
      const scope = await resolveManagedResendInboundScope(email.to);
      if (!scope) {
        await complete(receipt.id, receipt.claimToken, {
          status: "IGNORED",
          processedAt: new Date(),
          lastErrorCode: "INBOUND_ROUTE_NOT_UNIQUE",
        });
        return { status: "IGNORED" };
      }
      const inbound = await recordResendInboundReceipt({
        ...scope,
        providerEventId: receipt.providerEventId,
        payloadHash: receipt.payloadHash,
        event,
      });
      await requestInboundReceiptProcessing(inbound.receiptId);
      await complete(receipt.id, receipt.claimToken, {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        providerAccountId: scope.providerAccountId,
        status: "PROCESSED",
        processedAt: new Date(),
      });
      return { status: "PROCESSED" };
    }

    const [delivery] = await db
      .select()
      .from(outboundDelivery)
      .where(
        and(
          eq(outboundDelivery.provider, "RESEND"),
          eq(outboundDelivery.providerMessageId, event.data.email_id),
        ),
      )
      .limit(1);
    if (!delivery?.providerAccountId) {
      throw new Error("The Resend delivery has not been correlated yet.");
    }
    await recordResendProviderEvent({
      providerAccountId: delivery.providerAccountId,
      organizationId: delivery.organizationId,
      locationId: delivery.locationId,
      providerEventId: receipt.providerEventId,
      payloadHash: receipt.payloadHash,
      event,
    });
    await complete(receipt.id, receipt.claimToken, {
      organizationId: delivery.organizationId,
      locationId: delivery.locationId,
      providerAccountId: delivery.providerAccountId,
      status: "PROCESSED",
      processedAt: new Date(),
    });
    return { status: "PROCESSED" };
  } catch (error) {
    const awaitingDeliveryCorrelation =
      error instanceof Error &&
      error.message === "The Resend delivery has not been correlated yet.";
    const terminal =
      !awaitingDeliveryCorrelation && receipt.attemptCount >= MAX_ATTEMPTS;
    await complete(receipt.id, receipt.claimToken, {
      status: terminal ? "DEAD_LETTER" : "FAILED",
      lastErrorCode: awaitingDeliveryCorrelation
        ? "RESEND_DELIVERY_CORRELATION_PENDING"
        : "RESEND_WEBHOOK_PROCESSING_FAILED",
      lastErrorMessage:
        error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
    });
    if (!terminal) throw error;
    return { status: "DEAD_LETTER" };
  }
}

export async function recoverManagedResendReceipts(): Promise<number> {
  const cutoff = new Date(Date.now() - RECEIPT_LEASE_MS);
  const receipts = await db
    .select({ id: communicationWebhookReceipt.id })
    .from(communicationWebhookReceipt)
    .where(
      and(
        eq(communicationWebhookReceipt.provider, "RESEND"),
        or(
          and(
            eq(communicationWebhookReceipt.status, "PENDING"),
            lt(communicationWebhookReceipt.receivedAt, cutoff),
          ),
          eq(communicationWebhookReceipt.status, "FAILED"),
          and(
            eq(communicationWebhookReceipt.status, "PROCESSING"),
            lt(communicationWebhookReceipt.leaseExpiresAt, cutoff),
          ),
        ),
      ),
    )
    .limit(50);
  for (const receipt of receipts) {
    await requestManagedResendReceiptProcessing(receipt.id);
  }
  return receipts.length;
}
