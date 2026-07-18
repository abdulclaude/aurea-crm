import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, or, sql } from "drizzle-orm";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { z } from "zod";

import { db } from "@/db";
import {
  client,
  communicationServiceProfile,
  communicationUsageLedger,
  twilioPhoneNumber,
  voiceCall,
} from "@/db/schema";
import {
  twilioInboundVoiceSchema,
  twilioRecordingStatusSchema,
  twilioVoiceStatusSchema,
} from "./twilio-webhook-receipts";
import { voiceMinuteReservationAmount } from "./voice-spend-policy";
import {
  projectVoiceStatus,
  shouldApplyVoiceStatus,
} from "@/features/communications/lib/policy";

type VoiceStatusEvent = z.infer<typeof twilioVoiceStatusSchema>;
type InboundVoiceEvent = z.infer<typeof twilioInboundVoiceSchema>;
type RecordingStatusEvent = z.infer<typeof twilioRecordingStatusSchema>;

const TERMINAL = new Set([
  "completed",
  "busy",
  "no-answer",
  "canceled",
  "failed",
]);

function billingPeriod(at: Date): string {
  return at.toISOString().slice(0, 7);
}

export async function applyTwilioVoiceStatus(input: {
  providerEventId: string;
  providerAccountId: string;
  organizationId: string;
  occurredAt: Date;
  event: VoiceStatusEvent;
}) {
  const call = await db.query.voiceCall.findFirst({
    where: and(
      eq(voiceCall.organizationId, input.organizationId),
      eq(voiceCall.providerAccountId, input.providerAccountId),
      eq(voiceCall.providerCallId, input.event.CallSid),
    ),
  });
  if (!call)
    throw new Error("The Twilio voice call has not been correlated yet.");
  const nextStatus = projectVoiceStatus(input.event.CallStatus);
  const terminal = TERMINAL.has(input.event.CallStatus.toLowerCase());
  const durationSeconds = input.event.CallDuration
    ? Number.parseInt(input.event.CallDuration, 10)
    : null;
  const customerRate = voiceMinuteReservationAmount();
  const isVerificationCall = call.idempotencyKey.startsWith(
    "twilio:voice:forwarding-verification:",
  );
  let ignored = false;
  await db.transaction(async (tx) => {
    const [lockedCall] = await tx
      .select()
      .from(voiceCall)
      .where(eq(voiceCall.id, call.id))
      .limit(1)
      .for("update");
    if (!lockedCall) {
      throw new Error("The correlated Twilio voice call no longer exists.");
    }
    if (!shouldApplyVoiceStatus(lockedCall.status, nextStatus)) {
      ignored = true;
      return;
    }
    await tx
      .update(voiceCall)
      .set({
        status: nextStatus,
        answeredAt:
          nextStatus === "IN_PROGRESS" && !lockedCall.answeredAt
            ? input.occurredAt
            : undefined,
        endedAt: terminal && !lockedCall.endedAt ? input.occurredAt : undefined,
        durationSeconds: terminal ? durationSeconds : undefined,
        customerCharge:
          terminal && customerRate && durationSeconds && !isVerificationCall
            ? sql`${customerRate}::numeric * ceil(${durationSeconds}::numeric / 60)`
            : undefined,
        failureCode: ["BUSY", "NO_ANSWER", "CANCELED", "FAILED"].includes(
          nextStatus,
        )
          ? `TWILIO_${nextStatus}`
          : undefined,
        updatedAt: new Date(),
      })
      .where(eq(voiceCall.id, call.id));
    if (!terminal) return;
    const [reservation] = await tx
      .select()
      .from(communicationUsageLedger)
      .where(
        and(
          eq(communicationUsageLedger.organizationId, call.organizationId),
          eq(communicationUsageLedger.voiceCallId, call.id),
          eq(communicationUsageLedger.entryKind, "RESERVATION"),
        ),
      )
      .limit(1);
    if (reservation) {
      await tx
        .insert(communicationUsageLedger)
        .values({
          id: createId(),
          organizationId: call.organizationId,
          locationId: call.locationId,
          clientId: call.clientId,
          provider: "TWILIO",
          providerAccountId: call.providerAccountId,
          phoneNumberId: call.phoneNumberId,
          voiceCallId: call.id,
          entryKind: "RELEASE",
          resourceType: "VOICE_SECOND",
          idempotencyKey: `twilio:voice:${call.id}:reservation-release`,
          providerEventId: input.providerEventId,
          providerResourceId: input.event.CallSid,
          quantity: reservation.quantity,
          unit: "second",
          providerCost: "0",
          customerCharge: reservation.customerCharge,
          currency: reservation.currency,
          occurredAt: input.occurredAt,
          billingPeriod: reservation.billingPeriod,
          metadata: { finalStatus: input.event.CallStatus },
        })
        .onConflictDoNothing();
    }
    if (customerRate && durationSeconds && !isVerificationCall) {
      await tx
        .insert(communicationUsageLedger)
        .values({
          id: createId(),
          organizationId: call.organizationId,
          locationId: call.locationId,
          clientId: call.clientId,
          provider: "TWILIO",
          providerAccountId: call.providerAccountId,
          phoneNumberId: call.phoneNumberId,
          voiceCallId: call.id,
          entryKind: "USAGE",
          resourceType: "VOICE_SECOND",
          idempotencyKey: `twilio:voice:${input.event.CallSid}:customer-charge`,
          providerEventId: input.providerEventId,
          providerResourceId: input.event.CallSid,
          quantity: String(durationSeconds),
          unit: "second",
          providerCost: "0",
          customerCharge: sql`${customerRate}::numeric * ceil(${durationSeconds}::numeric / 60)`,
          currency: call.currency,
          occurredAt: input.occurredAt,
          billingPeriod: billingPeriod(input.occurredAt),
          metadata: { basis: "configured-minute-rate" },
        })
        .onConflictDoNothing();
    }
  });
  return { status: ignored ? "IGNORED_STALE" : "APPLIED" };
}

export async function applyTwilioInboundVoice(input: {
  providerAccountId: string;
  organizationId: string;
  occurredAt: Date;
  event: InboundVoiceEvent;
}) {
  const phone = await db.query.twilioPhoneNumber.findFirst({
    where: and(
      eq(twilioPhoneNumber.organizationId, input.organizationId),
      eq(twilioPhoneNumber.providerAccountId, input.providerAccountId),
      eq(twilioPhoneNumber.phoneNumber, input.event.To),
      eq(twilioPhoneNumber.status, "ACTIVE"),
      eq(twilioPhoneNumber.voiceEnabled, true),
    ),
  });
  if (!phone) throw new Error("Inbound voice number is not active.");
  const profile = await db.query.communicationServiceProfile.findFirst({
    where: eq(communicationServiceProfile.organizationId, input.organizationId),
  });
  const parsed = parsePhoneNumberFromString(input.event.From);
  const normalized = parsed?.isValid() ? parsed.number : input.event.From;
  const member = await db.query.client.findFirst({
    where: and(
      eq(client.organizationId, input.organizationId),
      phone.locationId ? eq(client.locationId, phone.locationId) : undefined,
      or(eq(client.phone, normalized), eq(client.mobilePhone, normalized)),
    ),
    columns: { id: true },
  });
  await db
    .insert(voiceCall)
    .values({
      id: createId(),
      organizationId: input.organizationId,
      locationId: phone.locationId,
      clientId: member?.id ?? null,
      providerAccountId: input.providerAccountId,
      phoneNumberId: phone.id,
      direction: "INBOUND",
      status: "RINGING",
      providerCallId: input.event.CallSid,
      fromNumber: input.event.From,
      toNumber: input.event.To,
      forwardingNumber: profile?.voiceForwardingNumber,
      recordingEnabled: profile?.recordingEnabled ?? false,
      currency: profile?.spendCurrency ?? "USD",
      idempotencyKey: `twilio:voice:inbound:${input.event.CallSid}`,
      startedAt: input.occurredAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [voiceCall.organizationId, voiceCall.idempotencyKey],
      set: {
        clientId: member?.id ?? undefined,
        updatedAt: new Date(),
      },
    });
  return { status: "APPLIED" };
}

export async function applyTwilioRecordingStatus(input: {
  providerAccountId: string;
  organizationId: string;
  occurredAt: Date;
  event: RecordingStatusEvent;
}) {
  const call = await db.query.voiceCall.findFirst({
    where: and(
      eq(voiceCall.organizationId, input.organizationId),
      eq(voiceCall.providerAccountId, input.providerAccountId),
      eq(voiceCall.providerCallId, input.event.CallSid),
    ),
  });
  if (!call)
    throw new Error("The Twilio recording has not been correlated yet.");
  const profile = await db.query.communicationServiceProfile.findFirst({
    where: eq(communicationServiceProfile.organizationId, input.organizationId),
  });
  if (
    !call.recordingEnabled ||
    !profile?.recordingLegalAcknowledgedAt ||
    !profile.recordingRetentionDays
  ) {
    throw new Error("Recording policy is no longer active.");
  }
  if (input.event.RecordingStatus.toLowerCase() !== "completed") {
    return { status: "IGNORED_NON_FINAL" };
  }
  const deleteAt = new Date(
    input.occurredAt.getTime() + profile.recordingRetentionDays * 86_400_000,
  );
  await db
    .update(voiceCall)
    .set({
      recordingProviderId: input.event.RecordingSid,
      recordingDeleteScheduledAt: deleteAt,
      updatedAt: new Date(),
    })
    .where(eq(voiceCall.id, call.id));
  return { status: "APPLIED", deleteAt };
}
