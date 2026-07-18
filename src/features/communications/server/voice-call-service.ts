import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import {
  and,
  desc,
  eq,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import twilio from "twilio";

import { db } from "@/db";
import {
  client,
  communicationServiceProfile,
  providerAccount,
  twilioPhoneNumber,
  voiceCall,
} from "@/db/schema";
import { inngest } from "@/inngest/client";
import { getCommunicationsPublicUrl } from "./platform-credentials";
import { applyTestingPlanAccess } from "./profile-service";
import { resolveTwilioPlatformAccount } from "./twilio-client";
import {
  releaseVoiceSpendReservation,
  reserveVoiceSpend,
} from "./voice-spend-policy";

const LEASE_MS = 10 * 60_000;

function normalizedDestination(value: string | null): {
  e164: string;
  country: string;
} | null {
  if (!value) return null;
  const parsed = parsePhoneNumberFromString(value);
  return parsed?.isValid() && parsed.country
    ? { e164: parsed.number, country: parsed.country }
    : null;
}

export async function activeVoiceNumber(input: {
  organizationId: string;
  locationId: string | null;
}) {
  const [number] = await db
    .select({
      id: twilioPhoneNumber.id,
      providerAccountId: twilioPhoneNumber.providerAccountId,
      phoneNumber: twilioPhoneNumber.phoneNumber,
    })
    .from(twilioPhoneNumber)
    .innerJoin(
      providerAccount,
      and(
        eq(providerAccount.id, twilioPhoneNumber.providerAccountId),
        eq(providerAccount.organizationId, twilioPhoneNumber.organizationId),
      ),
    )
    .where(
      and(
        eq(twilioPhoneNumber.organizationId, input.organizationId),
        input.locationId
          ? or(
              eq(twilioPhoneNumber.locationId, input.locationId),
              isNull(twilioPhoneNumber.locationId),
            )
          : isNull(twilioPhoneNumber.locationId),
        eq(twilioPhoneNumber.status, "ACTIVE"),
        eq(twilioPhoneNumber.voiceEnabled, true),
        eq(providerAccount.provider, "TWILIO"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
        eq(providerAccount.status, "ACTIVE"),
      ),
    )
    .orderBy(
      desc(twilioPhoneNumber.isDefault),
      desc(twilioPhoneNumber.createdAt),
    )
    .limit(1);
  return number ?? null;
}

export async function enqueueOutboundVoiceCall(input: {
  organizationId: string;
  locationId: string | null;
  clientId: string;
  idempotencyKey: string;
}) {
  const [member, number] = await Promise.all([
    db.query.client.findFirst({
      where: and(
        eq(client.id, input.clientId),
        eq(client.organizationId, input.organizationId),
        input.locationId
          ? eq(client.locationId, input.locationId)
          : isNull(client.locationId),
      ),
      columns: { id: true, phone: true, mobilePhone: true },
    }),
    activeVoiceNumber(input),
  ]);
  if (!member) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Client not found." });
  }
  const destination = normalizedDestination(member.mobilePhone ?? member.phone);
  if (!destination) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The client needs a valid international phone number.",
    });
  }
  if (!number) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "No active managed voice number is available.",
    });
  }

  const now = new Date();
  const callId = createId();
  const call = await db.transaction(async (tx) => {
    const [profile] = await tx
      .select()
      .from(communicationServiceProfile)
      .where(
        eq(communicationServiceProfile.organizationId, input.organizationId),
      )
      .limit(1);
    const effectiveProfile = profile
      ? applyTestingPlanAccess(profile)
      : undefined;
    if (
      !effectiveProfile?.voiceEntitledAt ||
      ["SUSPENDED", "RELEASED", "CANCELLATION_GRACE_PERIOD"].includes(
        effectiveProfile.voiceState,
      )
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Voice is not included in the active plan.",
      });
    }
    if (!effectiveProfile.voiceForwardingNumber) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Configure a verified staff forwarding number first.",
      });
    }
    if (!effectiveProfile.voiceForwardingNumberVerifiedAt) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Verify the staff forwarding number before placing calls.",
      });
    }
    if (!effectiveProfile.allowedVoiceCountries.includes(destination.country)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "The destination country is not allowed by voice policy.",
      });
    }
    const [created] = await tx
      .insert(voiceCall)
      .values({
        id: callId,
        organizationId: input.organizationId,
        locationId: input.locationId,
        clientId: member.id,
        providerAccountId: number.providerAccountId,
        phoneNumberId: number.id,
        direction: "OUTBOUND",
        status: "QUEUED",
        fromNumber: number.phoneNumber,
        toNumber: destination.e164,
        forwardingNumber: effectiveProfile.voiceForwardingNumber,
        recordingEnabled: effectiveProfile.recordingEnabled,
        currency: effectiveProfile.spendCurrency,
        idempotencyKey: input.idempotencyKey,
        nextAttemptAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [voiceCall.organizationId, voiceCall.idempotencyKey],
      })
      .returning();
    if (!created) {
      const existing = await tx.query.voiceCall.findFirst({
        where: and(
          eq(voiceCall.organizationId, input.organizationId),
          eq(voiceCall.idempotencyKey, input.idempotencyKey),
        ),
      });
      if (!existing) throw new Error("Voice-call idempotency lookup failed.");
      return existing;
    }
    await reserveVoiceSpend({
      tx,
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: member.id,
      providerAccountId: number.providerAccountId,
      phoneNumberId: number.id,
      voiceCallId: created.id,
      at: now,
    });
    return created;
  });
  await inngest.send({
    name: "communications/voice-call.requested",
    id: `communications-voice-call:${call.id}`,
    data: { voiceCallId: call.id },
  });
  return call;
}

async function claimVoiceCall(voiceCallId: string) {
  const now = new Date();
  const token = createId();
  const [call] = await db
    .update(voiceCall)
    .set({
      claimToken: token,
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      attemptCount: sql`${voiceCall.attemptCount} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(voiceCall.id, voiceCallId),
        or(
          and(
            eq(voiceCall.status, "QUEUED"),
            or(
              isNull(voiceCall.nextAttemptAt),
              lte(voiceCall.nextAttemptAt, now),
            ),
          ),
          and(
            eq(voiceCall.status, "FAILED"),
            isNotNull(voiceCall.nextAttemptAt),
            lte(voiceCall.nextAttemptAt, now),
          ),
        ),
        or(isNull(voiceCall.leaseExpiresAt), lt(voiceCall.leaseExpiresAt, now)),
        lt(voiceCall.attemptCount, voiceCall.maxAttempts),
      ),
    )
    .returning();
  return call ? { ...call, claimToken: token } : null;
}

export async function dispatchVoiceCall(voiceCallId: string) {
  const call = await claimVoiceCall(voiceCallId);
  if (!call) return { status: "NOT_CLAIMED" };
  let providerAttempted = false;
  try {
    const [profile, number] = await Promise.all([
      db.query.communicationServiceProfile.findFirst({
        where: eq(
          communicationServiceProfile.organizationId,
          call.organizationId,
        ),
      }),
      db.query.twilioPhoneNumber.findFirst({
        where: and(
          eq(twilioPhoneNumber.organizationId, call.organizationId),
          eq(twilioPhoneNumber.id, call.phoneNumberId),
          eq(twilioPhoneNumber.status, "ACTIVE"),
          eq(twilioPhoneNumber.voiceEnabled, true),
        ),
      }),
    ]);
    const effectiveProfile = profile
      ? applyTestingPlanAccess(profile)
      : undefined;
    if (
      !effectiveProfile?.voiceEntitledAt ||
      !effectiveProfile.voiceMaxCallDurationSeconds ||
      !number
    ) {
      throw new Error(
        "Voice entitlement, duration policy, or number is unavailable.",
      );
    }
    const binding = await resolveTwilioPlatformAccount({
      organizationId: call.organizationId,
    });
    if (!binding.client || binding.account.id !== call.providerAccountId) {
      throw new Error("The scoped Twilio subaccount is unavailable.");
    }
    const response = new twilio.twiml.VoiceResponse();
    const dial = response.dial({
      callerId: call.fromNumber,
      timeLimit: effectiveProfile.voiceMaxCallDurationSeconds,
      record: call.recordingEnabled
        ? "record-from-answer-dual"
        : "do-not-record",
      recordingStatusCallback: call.recordingEnabled
        ? `${getCommunicationsPublicUrl()}/api/webhooks/twilio/voice/recording`
        : undefined,
      recordingStatusCallbackMethod: call.recordingEnabled ? "POST" : undefined,
    });
    dial.number(call.toNumber);
    const [providerClaim] = await db
      .update(voiceCall)
      .set({
        failureCode: "TWILIO_CALL_CREATE_IN_FLIGHT",
        leaseExpiresAt: new Date(Date.now() + LEASE_MS),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(voiceCall.id, call.id),
          eq(voiceCall.claimToken, call.claimToken),
        ),
      )
      .returning({ id: voiceCall.id });
    if (!providerClaim) return { status: "NOT_CLAIMED" };
    providerAttempted = true;
    const created = await binding.client.calls.create({
      from: call.fromNumber,
      to: call.forwardingNumber ?? "",
      twiml: response.toString(),
      timeout: 30,
      timeLimit: effectiveProfile.voiceMaxCallDurationSeconds,
      statusCallback: `${getCommunicationsPublicUrl()}/api/webhooks/twilio/voice/status`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });
    const [persisted] = await db
      .update(voiceCall)
      .set({
        providerCallId: created.sid,
        status: created.status === "ringing" ? "RINGING" : "QUEUED",
        startedAt: new Date(),
        failureCode: null,
        failureMessage: null,
        claimToken: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(voiceCall.id, call.id),
          eq(voiceCall.claimToken, call.claimToken),
        ),
      )
      .returning({ id: voiceCall.id });
    if (!persisted) return { status: "AMBIGUOUS" };
    return { status: "DISPATCHED", providerCallId: created.sid };
  } catch (error) {
    const terminal = providerAttempted || call.attemptCount >= call.maxAttempts;
    await db.transaction(async (tx) => {
      const [failed] = await tx
        .update(voiceCall)
        .set({
          status: "FAILED",
          failureCode: providerAttempted
            ? "TWILIO_CALL_CREATE_AMBIGUOUS"
            : "TWILIO_CALL_CREATE_FAILED",
          failureMessage:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown error",
          claimToken: null,
          leaseExpiresAt: null,
          nextAttemptAt: terminal
            ? null
            : new Date(
                Date.now() + Math.min(60_000, 2 ** call.attemptCount * 1_000),
              ),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(voiceCall.id, call.id),
            eq(voiceCall.claimToken, call.claimToken),
          ),
        )
        .returning({ id: voiceCall.id });
      if (failed && terminal && !providerAttempted) {
        await releaseVoiceSpendReservation({
          tx,
          organizationId: call.organizationId,
          voiceCallId: call.id,
          reason: "provider-call-not-created",
          at: new Date(),
        });
      }
    });
    if (!terminal) throw error;
    return { status: providerAttempted ? "AMBIGUOUS" : "FAILED" };
  }
}

export async function recoverVoiceCalls() {
  const now = new Date();
  await db
    .update(voiceCall)
    .set({
      status: "FAILED",
      failureCode: "TWILIO_CALL_CREATE_AMBIGUOUS",
      failureMessage:
        "The provider request lease expired before its outcome was persisted.",
      claimToken: null,
      leaseExpiresAt: null,
      nextAttemptAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(voiceCall.status, "QUEUED"),
        eq(voiceCall.failureCode, "TWILIO_CALL_CREATE_IN_FLIGHT"),
        lt(voiceCall.leaseExpiresAt, now),
      ),
    );
  const calls = await db
    .select({ id: voiceCall.id })
    .from(voiceCall)
    .where(
      and(
        or(
          and(
            eq(voiceCall.status, "QUEUED"),
            or(
              isNull(voiceCall.nextAttemptAt),
              lte(voiceCall.nextAttemptAt, now),
            ),
          ),
          and(
            eq(voiceCall.status, "FAILED"),
            isNotNull(voiceCall.nextAttemptAt),
            lte(voiceCall.nextAttemptAt, now),
          ),
        ),
        or(isNull(voiceCall.leaseExpiresAt), lt(voiceCall.leaseExpiresAt, now)),
        lt(voiceCall.attemptCount, voiceCall.maxAttempts),
      ),
    )
    .limit(50);
  for (const call of calls) {
    await inngest.send({
      name: "communications/voice-call.requested",
      id: `communications-voice-call-recovery:${call.id}:${now.getTime()}`,
      data: { voiceCallId: call.id },
    });
  }
  return calls.length;
}
