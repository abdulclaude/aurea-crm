import "server-only";

import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, gte, lt, sql } from "drizzle-orm";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import twilio from "twilio";
import { z } from "zod";

import { db } from "@/db";
import { communicationServiceProfile, voiceCall } from "@/db/schema";
import { getCommunicationsPublicUrl } from "./platform-credentials";
import { requireCommunicationEntitlement } from "./profile-service";
import { resolveTwilioPlatformAccount } from "./twilio-client";
import { activeVoiceNumber } from "./voice-call-service";
import { reserveVoiceSpend } from "./voice-spend-policy";

const cooldownSchema = z.coerce.number().int().min(60).max(86_400).default(600);

function verificationCooldownSeconds(): number {
  return cooldownSchema.parse(
    process.env.AUREA_VOICE_VERIFICATION_COOLDOWN_SECONDS,
  );
}

function verificationPepper(): string {
  const value = process.env.ENCRYPTION_KEY;
  if (!value) throw new Error("ENCRYPTION_KEY is required for verification.");
  return value;
}

function hashCode(code: string, salt: string): string {
  return createHmac("sha256", verificationPepper())
    .update(`${salt}:${code}`)
    .digest("hex");
}

export async function requestForwardingNumberVerification(input: {
  organizationId: string;
  locationId: string | null;
}) {
  const [profile, number] = await Promise.all([
    requireCommunicationEntitlement({
      organizationId: input.organizationId,
      channel: "VOICE",
    }),
    activeVoiceNumber(input),
  ]);
  if (!profile.voiceForwardingNumber) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Save a staff forwarding number before verifying it.",
    });
  }
  const forwardingNumber = profile.voiceForwardingNumber;
  const parsedForwarding = parsePhoneNumberFromString(forwardingNumber);
  if (
    !parsedForwarding?.isValid() ||
    !parsedForwarding.country ||
    !profile.allowedVoiceCountries.includes(parsedForwarding.country)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "The forwarding number must be valid and use an allowed voice country.",
    });
  }
  if (!number) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "An active managed voice number is required for verification.",
    });
  }
  const binding = await resolveTwilioPlatformAccount({
    organizationId: input.organizationId,
  });
  if (!binding.client || binding.account.id !== number.providerAccountId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The scoped Twilio subaccount is unavailable.",
    });
  }
  const code = randomInt(100_000, 1_000_000).toString();
  const salt = randomBytes(16).toString("hex");
  const verificationHash = `${salt}:${hashCode(code, salt)}`;
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  const callId = createId();
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`${input.organizationId}:VOICE:FORWARDING_VERIFICATION`}))`,
    );
    const cooldownStart = new Date(
      Date.now() - verificationCooldownSeconds() * 1_000,
    );
    const [recentRequest] = await tx
      .select({ id: voiceCall.id })
      .from(voiceCall)
      .where(
        and(
          eq(voiceCall.organizationId, input.organizationId),
          sql`${voiceCall.idempotencyKey} LIKE 'twilio:voice:forwarding-verification:%'`,
          gte(voiceCall.createdAt, cooldownStart),
        ),
      )
      .limit(1);
    if (recentRequest) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Wait before requesting another verification call.",
      });
    }
    await tx
      .update(communicationServiceProfile)
      .set({
        voiceForwardingVerificationHash: verificationHash,
        voiceForwardingVerificationExpiresAt: expiresAt,
        voiceForwardingVerificationAttempts: 0,
        voiceForwardingNumberVerifiedAt: null,
        updatedAt: new Date(),
      })
      .where(
        eq(
          communicationServiceProfile.organizationId,
          input.organizationId,
        ),
      );
    await tx.insert(voiceCall).values({
      id: callId,
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: null,
      providerAccountId: number.providerAccountId,
      phoneNumberId: number.id,
      direction: "OUTBOUND",
      status: "QUEUED",
      fromNumber: number.phoneNumber,
      toNumber: forwardingNumber,
      forwardingNumber,
      recordingEnabled: false,
      currency: profile.spendCurrency,
      idempotencyKey: `twilio:voice:forwarding-verification:${verificationHash}`,
      nextAttemptAt: null,
      maxAttempts: 1,
      updatedAt: new Date(),
    });
    await reserveVoiceSpend({
      tx,
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: null,
      providerAccountId: number.providerAccountId,
      phoneNumberId: number.id,
      voiceCallId: callId,
      at: new Date(),
    });
  });

  const response = new twilio.twiml.VoiceResponse();
  response.say(`Your Aurea verification code is ${code.split("").join(" ")}.`);
  response.pause({ length: 1 });
  response.say(`Again, ${code.split("").join(" ")}.`);
  try {
    const remote = await binding.client.calls.create({
      from: number.phoneNumber,
      to: forwardingNumber,
      twiml: response.toString(),
      timeout: 30,
      timeLimit: 60,
      statusCallback: `${getCommunicationsPublicUrl()}/api/webhooks/twilio/voice/status`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });
    await db
      .update(voiceCall)
      .set({
        providerCallId: remote.sid,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(voiceCall.id, callId));
  } catch (error) {
    await db
      .update(voiceCall)
      .set({
        status: "FAILED",
        failureCode: "TWILIO_CALL_CREATE_AMBIGUOUS",
        failureMessage:
          error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(voiceCall.id, callId));
    throw error;
  }
  return { sent: true, expiresAt };
}

export async function confirmForwardingNumberVerification(input: {
  organizationId: string;
  code: string;
}) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [profile] = await tx
      .select()
      .from(communicationServiceProfile)
      .where(
        and(
          eq(
            communicationServiceProfile.organizationId,
            input.organizationId,
          ),
          gt(communicationServiceProfile.voiceForwardingVerificationExpiresAt, now),
          lt(communicationServiceProfile.voiceForwardingVerificationAttempts, 5),
        ),
      )
      .limit(1)
      .for("update");
    if (
      !profile?.voiceForwardingNumber ||
      !profile.voiceForwardingVerificationHash
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Request a new forwarding-number verification code.",
      });
    }
    const [salt, expected] = profile.voiceForwardingVerificationHash.split(":");
    const actual = salt ? hashCode(input.code, salt) : "";
    const matches =
      expected?.length === actual.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
    if (!matches) {
      await tx
        .update(communicationServiceProfile)
        .set({
          voiceForwardingVerificationAttempts: sql`${communicationServiceProfile.voiceForwardingVerificationAttempts} + 1`,
          updatedAt: now,
        })
        .where(eq(communicationServiceProfile.id, profile.id));
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "The verification code is incorrect or expired.",
      });
    }
    const [verified] = await tx
      .update(communicationServiceProfile)
      .set({
        voiceForwardingNumberVerifiedAt: now,
        voiceForwardingVerificationHash: null,
        voiceForwardingVerificationExpiresAt: null,
        voiceForwardingVerificationAttempts: 0,
        updatedAt: now,
      })
      .where(eq(communicationServiceProfile.id, profile.id))
      .returning();
    return verified;
  });
}
