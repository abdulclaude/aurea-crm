import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import twilio from "twilio";

import { db } from "@/db";
import {
  communicationServiceProfile,
  communicationUsageLedger,
  twilioPhoneNumber,
  voiceCall,
} from "@/db/schema";
import { getCommunicationsPublicUrl } from "./platform-credentials";
import { reserveVoiceSpend } from "./voice-spend-policy";

const TERMINAL_CALL_STATUSES: ReadonlySet<
  typeof voiceCall.$inferSelect.status
> = new Set(["COMPLETED", "FAILED", "BUSY", "NO_ANSWER", "CANCELED"]);

export async function buildInboundVoiceResponse(input: {
  organizationId: string;
  providerAccountId: string;
  callSid: string;
  to: string;
  from: string;
  fromCountry?: string;
}): Promise<string> {
  const [phone, profile] = await Promise.all([
    db.query.twilioPhoneNumber.findFirst({
      where: and(
        eq(twilioPhoneNumber.organizationId, input.organizationId),
        eq(twilioPhoneNumber.providerAccountId, input.providerAccountId),
        eq(twilioPhoneNumber.phoneNumber, input.to),
        eq(twilioPhoneNumber.status, "ACTIVE"),
        eq(twilioPhoneNumber.voiceEnabled, true),
      ),
    }),
    db.query.communicationServiceProfile.findFirst({
      where: eq(
        communicationServiceProfile.organizationId,
        input.organizationId,
      ),
    }),
  ]);
  const response = new twilio.twiml.VoiceResponse();
  const active =
    phone &&
    profile?.voiceEntitledAt &&
    !["SUSPENDED", "RELEASED", "CANCELLATION_GRACE_PERIOD"].includes(
      profile.voiceState,
    );
  const countryAllowed =
    !input.fromCountry ||
    profile?.allowedVoiceCountries.includes(input.fromCountry);
  if (!active || !countryAllowed) {
    response.reject({ reason: "rejected" });
    return response.toString();
  }
  let maxDurationSeconds: number;
  try {
    maxDurationSeconds = await db.transaction(async (tx) => {
      const callId = createId();
      const [created] = await tx
        .insert(voiceCall)
        .values({
          id: callId,
          organizationId: input.organizationId,
          locationId: phone.locationId,
          clientId: null,
          providerAccountId: input.providerAccountId,
          phoneNumberId: phone.id,
          direction: "INBOUND",
          status: "RINGING",
          providerCallId: input.callSid,
          fromNumber: input.from,
          toNumber: input.to,
          forwardingNumber: profile.voiceForwardingNumber,
          recordingEnabled: profile.recordingEnabled,
          currency: profile.spendCurrency,
          idempotencyKey: `twilio:voice:inbound:${input.callSid}`,
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: voiceCall.id });
      if (created) {
        const reservation = await reserveVoiceSpend({
          tx,
          organizationId: input.organizationId,
          locationId: phone.locationId,
          clientId: null,
          providerAccountId: input.providerAccountId,
          phoneNumberId: phone.id,
          voiceCallId: created.id,
          at: new Date(),
        });
        return reservation.maxDurationSeconds;
      }
      const [existing] = await tx
        .select({
          id: voiceCall.id,
          status: voiceCall.status,
          maxDurationSeconds: communicationUsageLedger.quantity,
        })
        .from(voiceCall)
        .innerJoin(
          communicationUsageLedger,
          and(
            eq(
              communicationUsageLedger.organizationId,
              voiceCall.organizationId,
            ),
            eq(communicationUsageLedger.voiceCallId, voiceCall.id),
            eq(communicationUsageLedger.entryKind, "RESERVATION"),
          ),
        )
        .where(
          and(
            eq(voiceCall.organizationId, input.organizationId),
            eq(voiceCall.providerAccountId, input.providerAccountId),
            eq(voiceCall.providerCallId, input.callSid),
          ),
        )
        .limit(1);
      if (!existing || TERMINAL_CALL_STATUSES.has(existing.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This inbound call is no longer eligible to connect.",
        });
      }
      return Number(existing.maxDurationSeconds);
    });
  } catch (error) {
    if (!(error instanceof TRPCError)) throw error;
    response.reject({ reason: "rejected" });
    return response.toString();
  }
  const recordingAllowed = Boolean(
    profile.recordingEnabled &&
    profile.recordingLegalAcknowledgedAt &&
    profile.recordingRetentionDays,
  );
  const recordingCallback = `${getCommunicationsPublicUrl()}/api/webhooks/twilio/voice/recording`;
  if (
    profile.voiceForwardingNumber &&
    profile.voiceForwardingNumberVerifiedAt &&
    maxDurationSeconds
  ) {
    const dial = response.dial({
      callerId: input.to,
      timeLimit: maxDurationSeconds,
      record: recordingAllowed ? "record-from-answer-dual" : "do-not-record",
      recordingStatusCallback: recordingAllowed ? recordingCallback : undefined,
      recordingStatusCallbackMethod: recordingAllowed ? "POST" : undefined,
    });
    dial.number(profile.voiceForwardingNumber);
    return response.toString();
  }
  if (profile.voicemailEnabled && maxDurationSeconds && recordingAllowed) {
    response.say("Please leave a message after the tone.");
    response.record({
      maxLength: maxDurationSeconds,
      playBeep: true,
      recordingStatusCallback: recordingCallback,
      recordingStatusCallbackMethod: "POST",
    });
    return response.toString();
  }
  response.say("This number is not available right now.");
  response.hangup();
  return response.toString();
}
