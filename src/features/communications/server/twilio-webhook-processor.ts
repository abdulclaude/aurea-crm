import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { communicationWebhookReceipt } from "@/db/schema";
import { decrypt } from "@/lib/encryption";
import { inngest } from "@/inngest/client";
import {
  applyTwilioInboundSms,
  applyTwilioSmsStatus,
} from "./twilio-sms-application";
import {
  applyTwilioInboundVoice,
  applyTwilioRecordingStatus,
  applyTwilioVoiceStatus,
} from "./twilio-voice-application";
import {
  formValues,
  twilioInboundSmsSchema,
  twilioInboundVoiceSchema,
  twilioRecordingStatusSchema,
  twilioSmsStatusSchema,
  twilioVoiceStatusSchema,
} from "./twilio-webhook-receipts";

const LEASE_MS = 2 * 60_000;
const MAX_ATTEMPTS = 8;

async function claim(receiptId: string) {
  const now = new Date();
  const claimToken = createId();
  const [receipt] = await db
    .update(communicationWebhookReceipt)
    .set({
      status: "PROCESSING",
      claimToken,
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      attemptCount: sql`${communicationWebhookReceipt.attemptCount} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(communicationWebhookReceipt.id, receiptId),
        eq(communicationWebhookReceipt.provider, "TWILIO"),
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
  return receipt?.claimToken ? { ...receipt, claimToken } : null;
}

async function complete(input: {
  id: string;
  claimToken: string;
  status: "PROCESSED" | "FAILED" | "DEAD_LETTER";
  error?: unknown;
}) {
  await db
    .update(communicationWebhookReceipt)
    .set({
      status: input.status,
      processedAt: input.status === "PROCESSED" ? new Date() : null,
      claimToken: null,
      leaseExpiresAt: null,
      lastErrorCode:
        input.status === "PROCESSED" ? null : "TWILIO_WEBHOOK_PROCESSING_FAILED",
      lastErrorMessage:
        input.error instanceof Error
          ? input.error.message.slice(0, 500)
          : input.error
            ? "Unknown Twilio webhook error"
            : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(communicationWebhookReceipt.id, input.id),
        eq(communicationWebhookReceipt.claimToken, input.claimToken),
      ),
    );
}

export async function processTwilioWebhookReceipt(receiptId: string) {
  const receipt = await claim(receiptId);
  if (!receipt) return { status: "NOT_CLAIMED" };
  if (!receipt.organizationId || !receipt.providerAccountId) {
    const error = new Error("Verified Twilio receipt is missing tenant scope.");
    await complete({
      id: receipt.id,
      claimToken: receipt.claimToken,
      status: "DEAD_LETTER",
      error,
    });
    return { status: "DEAD_LETTER" };
  }
  try {
    const values = formValues(decrypt(receipt.encryptedPayload));
    if (receipt.eventType === "sms.status") {
      await applyTwilioSmsStatus({
        receiptId: receipt.id,
        providerEventId: receipt.providerEventId,
        providerAccountId: receipt.providerAccountId,
        organizationId: receipt.organizationId,
        payloadHash: receipt.payloadHash,
        occurredAt: receipt.occurredAt,
        event: twilioSmsStatusSchema.parse(values),
      });
    } else if (receipt.eventType === "sms.inbound") {
      await applyTwilioInboundSms({
        receiptId: receipt.id,
        providerAccountId: receipt.providerAccountId,
        organizationId: receipt.organizationId,
        occurredAt: receipt.occurredAt,
        event: twilioInboundSmsSchema.parse(values),
      });
    } else if (receipt.eventType === "voice.status") {
      await applyTwilioVoiceStatus({
        providerEventId: receipt.providerEventId,
        providerAccountId: receipt.providerAccountId,
        organizationId: receipt.organizationId,
        occurredAt: receipt.occurredAt,
        event: twilioVoiceStatusSchema.parse(values),
      });
    } else if (receipt.eventType === "voice.inbound") {
      await applyTwilioInboundVoice({
        providerAccountId: receipt.providerAccountId,
        organizationId: receipt.organizationId,
        occurredAt: receipt.occurredAt,
        event: twilioInboundVoiceSchema.parse(values),
      });
    } else if (receipt.eventType === "voice.recording") {
      await applyTwilioRecordingStatus({
        providerAccountId: receipt.providerAccountId,
        organizationId: receipt.organizationId,
        occurredAt: receipt.occurredAt,
        event: twilioRecordingStatusSchema.parse(values),
      });
    } else {
      throw new Error("Unsupported Twilio webhook event type.");
    }
    await complete({
      id: receipt.id,
      claimToken: receipt.claimToken,
      status: "PROCESSED",
    });
    return { status: "PROCESSED" };
  } catch (error) {
    const terminal = receipt.attemptCount >= MAX_ATTEMPTS;
    await complete({
      id: receipt.id,
      claimToken: receipt.claimToken,
      status: terminal ? "DEAD_LETTER" : "FAILED",
      error,
    });
    if (!terminal) throw error;
    return { status: "DEAD_LETTER" };
  }
}

export async function recoverTwilioWebhookReceipts() {
  const cutoff = new Date(Date.now() - LEASE_MS);
  const receipts = await db
    .select({ id: communicationWebhookReceipt.id })
    .from(communicationWebhookReceipt)
    .where(
      and(
        eq(communicationWebhookReceipt.provider, "TWILIO"),
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
    await inngest.send({
      name: "communications/twilio-webhook.received",
      id: `communications-twilio-webhook-recovery:${receipt.id}:${Date.now()}`,
      data: { receiptId: receipt.id },
    });
  }
  return receipts.length;
}
