import "server-only";

import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import twilio from "twilio";

import { db } from "@/db";
import {
  communicationWebhookReceipt,
  providerAccount,
} from "@/db/schema";
import { decrypt, encrypt } from "@/lib/encryption";
import { inngest } from "@/inngest/client";
import { getCommunicationsPublicUrl } from "./platform-credentials";
import { formValues } from "@/features/communications/lib/twilio-webhook-contracts";

export {
  formValues,
  twilioInboundSmsSchema,
  twilioInboundVoiceSchema,
  twilioRecordingStatusSchema,
  twilioSmsStatusSchema,
  twilioVoiceStatusSchema,
} from "@/features/communications/lib/twilio-webhook-contracts";

export type TwilioWebhookEventType =
  | "sms.status"
  | "sms.inbound"
  | "voice.status"
  | "voice.inbound"
  | "voice.recording";

export async function verifyAndRecordTwilioWebhook(input: {
  body: string;
  signature: string;
  pathname: string;
  eventType: TwilioWebhookEventType;
}) {
  const values = formValues(input.body);
  const accountSid = values.AccountSid;
  if (!accountSid) return null;
  const [account] = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.provider, "TWILIO"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
        eq(providerAccount.externalAccountId, accountSid),
        eq(providerAccount.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!account?.encryptedSecret) return null;
  const url = `${getCommunicationsPublicUrl()}${input.pathname}`;
  if (
    !twilio.validateRequest(
      decrypt(account.encryptedSecret),
      input.signature,
      url,
      values,
    )
  ) {
    return null;
  }
  const resourceId = values.MessageSid ?? values.RecordingSid ?? values.CallSid;
  if (!resourceId) return null;
  const payloadHash = createHash("sha256").update(input.body).digest("hex");
  const eventIdentity =
    input.eventType === "sms.status"
      ? `${resourceId}:${values.MessageStatus ?? "unknown"}:${payloadHash}`
      : input.eventType === "voice.status"
        ? `${resourceId}:${values.CallStatus ?? "unknown"}:${payloadHash}`
        : input.eventType === "voice.recording"
          ? `${resourceId}:${values.RecordingStatus ?? "unknown"}:${payloadHash}`
          : resourceId;
  const [created] = await db
    .insert(communicationWebhookReceipt)
    .values({
      id: createId(),
      organizationId: account.organizationId,
      locationId: null,
      provider: "TWILIO",
      providerAccountId: account.id,
      providerAccountRef: account.id,
      eventType: input.eventType,
      providerEventId: eventIdentity,
      providerResourceId: resourceId,
      payloadHash,
      encryptedPayload: encrypt(input.body),
      safeMetadata: {
        messageStatus: values.MessageStatus,
        callStatus: values.CallStatus,
        recordingStatus: values.RecordingStatus,
        errorCode: values.ErrorCode,
      },
      occurredAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: communicationWebhookReceipt.id });
  const receipt = created ??
    (await db.query.communicationWebhookReceipt.findFirst({
      where: and(
        eq(communicationWebhookReceipt.provider, "TWILIO"),
        eq(communicationWebhookReceipt.providerAccountRef, account.id),
        eq(communicationWebhookReceipt.eventType, input.eventType),
        eq(communicationWebhookReceipt.providerEventId, eventIdentity),
      ),
      columns: { id: true },
    }));
  if (!receipt) throw new Error("Verified Twilio receipt could not be stored.");
  await inngest.send({
    name: "communications/twilio-webhook.received",
    id: `communications-twilio-webhook:${receipt.id}`,
    data: { receiptId: receipt.id },
  });
  return {
    receiptId: receipt.id,
    organizationId: account.organizationId,
    providerAccountId: account.id,
    values,
    duplicate: !created,
  };
}
