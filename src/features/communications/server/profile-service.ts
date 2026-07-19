import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  communicationProvisioningOperation,
  communicationServiceProfile,
  twilioPhoneNumber,
} from "@/db/schema";
import { inngest } from "@/inngest/client";
import type {
  CommunicationChannel,
  CommunicationChannelState,
  CommunicationProfileUpdate,
} from "@/features/communications/contracts";
import type { DeliveryTransaction } from "@/features/delivery/server/outbox";

type CommunicationProfile = typeof communicationServiceProfile.$inferSelect;

export function applyTestingPlanAccess(
  profile: CommunicationProfile,
): CommunicationProfile {
  const entitledAt = profile.createdAt;
  return {
    ...profile,
    brandedEmailEntitledAt: profile.brandedEmailEntitledAt ?? entitledAt,
    smsEntitledAt: profile.smsEntitledAt ?? entitledAt,
    voiceEntitledAt: profile.voiceEntitledAt ?? entitledAt,
  };
}

const ENTITLEMENT_FIELDS = {
  EMAIL: "brandedEmailEntitledAt",
  SMS: "smsEntitledAt",
  VOICE: "voiceEntitledAt",
} as const satisfies Record<CommunicationChannel, keyof CommunicationProfile>;

const STATE_FIELDS = {
  EMAIL: "emailState",
  SMS: "smsState",
  VOICE: "voiceState",
} as const satisfies Record<CommunicationChannel, keyof CommunicationProfile>;

export async function getOrCreateCommunicationProfile(
  organizationId: string,
): Promise<CommunicationProfile> {
  await db
    .insert(communicationServiceProfile)
    .values({
      id: createId(),
      organizationId,
    })
    .onConflictDoNothing({
      target: communicationServiceProfile.organizationId,
    });

  const profile = await db.query.communicationServiceProfile.findFirst({
    where: eq(communicationServiceProfile.organizationId, organizationId),
  });
  if (!profile) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The communications profile could not be initialized.",
    });
  }
  return profile;
}

export async function updateCommunicationProfile(input: {
  organizationId: string;
  settings: CommunicationProfileUpdate;
}): Promise<CommunicationProfile> {
  const existing = await getOrCreateCommunicationProfile(input.organizationId);
  const now = new Date();
  const [updated] = await db
    .update(communicationServiceProfile)
    .set({
      fallbackEmailEnabled: input.settings.fallbackEmailEnabled,
      spendCurrency: input.settings.spendCurrency,
      smsMonthlySpendLimit: input.settings.smsMonthlySpendLimit,
      voiceMonthlySpendLimit: input.settings.voiceMonthlySpendLimit,
      voiceMaxCallDurationSeconds:
        input.settings.voiceMaxCallDurationSeconds,
      numberReleaseGraceDays: input.settings.numberReleaseGraceDays,
      allowedSmsCountries: input.settings.allowedSmsCountries,
      allowedVoiceCountries: input.settings.allowedVoiceCountries,
      voiceForwardingNumber: input.settings.voiceForwardingNumber,
      voiceForwardingNumberVerifiedAt:
        existing.voiceForwardingNumber === input.settings.voiceForwardingNumber
          ? existing.voiceForwardingNumberVerifiedAt
          : null,
      voiceForwardingVerificationHash:
        existing.voiceForwardingNumber === input.settings.voiceForwardingNumber
          ? existing.voiceForwardingVerificationHash
          : null,
      voiceForwardingVerificationExpiresAt:
        existing.voiceForwardingNumber === input.settings.voiceForwardingNumber
          ? existing.voiceForwardingVerificationExpiresAt
          : null,
      voiceForwardingVerificationAttempts:
        existing.voiceForwardingNumber === input.settings.voiceForwardingNumber
          ? existing.voiceForwardingVerificationAttempts
          : 0,
      voicemailEnabled: input.settings.voicemailEnabled,
      recordingEnabled: input.settings.recordingEnabled,
      recordingRetentionDays: input.settings.recordingRetentionDays,
      recordingLegalAcknowledgedAt:
        input.settings.recordingEnabled &&
        input.settings.recordingLegalAcknowledged
          ? now
          : null,
      updatedAt: now,
    })
    .where(
      eq(communicationServiceProfile.organizationId, input.organizationId),
    )
    .returning();
  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The communications profile could not be updated.",
    });
  }
  return updated;
}

function entitledState(
  current: CommunicationChannelState,
): CommunicationChannelState {
  if (
    current === "NOT_REQUESTED" ||
    current === "SUSPENDED" ||
    current === "FAILED" ||
    current === "CANCELLATION_GRACE_PERIOD" ||
    current === "RELEASE_SCHEDULED" ||
    current === "RELEASED"
  ) {
    return "PROVISIONING";
  }
  return current;
}

export async function setCommunicationEntitlements(input: {
  organizationId: string;
  source: string;
  email: boolean;
  sms: boolean;
  voice: boolean;
  effectiveAt?: Date;
}): Promise<CommunicationProfile> {
  const effectiveAt = input.effectiveAt ?? new Date();
  const result = await db.transaction((tx) =>
    setCommunicationEntitlementsInTransaction(tx, {
      ...input,
      effectiveAt,
    }),
  );
  if (result.queuedRelease) {
    await requestEntitlementReleaseProcessing(
      input.organizationId,
      effectiveAt,
    );
  }
  return result.profile;
}

async function setCommunicationEntitlementsInTransaction(
  tx: DeliveryTransaction,
  input: {
    organizationId: string;
    source: string;
    email: boolean;
    sms: boolean;
    voice: boolean;
    effectiveAt: Date;
  },
): Promise<{ profile: CommunicationProfile; queuedRelease: boolean }> {
  await tx
    .insert(communicationServiceProfile)
    .values({ id: createId(), organizationId: input.organizationId })
    .onConflictDoNothing({
      target: communicationServiceProfile.organizationId,
    });
  const [profile] = await tx
    .select()
    .from(communicationServiceProfile)
    .where(
      eq(communicationServiceProfile.organizationId, input.organizationId),
    )
    .limit(1)
    .for("update");
  if (!profile) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The communications profile could not be initialized.",
    });
  }
  const effectiveAt = input.effectiveAt;
  const emailState = input.email
    ? entitledState(profile.emailState)
    : profile.brandedEmailEntitledAt
      ? "CANCELLATION_GRACE_PERIOD"
      : profile.emailState;
  const smsState = input.sms
    ? entitledState(profile.smsState)
    : profile.smsEntitledAt
      ? "CANCELLATION_GRACE_PERIOD"
      : profile.smsState;
  const voiceState = input.voice
    ? entitledState(profile.voiceState)
    : profile.voiceEntitledAt
      ? "CANCELLATION_GRACE_PERIOD"
      : profile.voiceState;

  const [updated] = await tx
    .update(communicationServiceProfile)
    .set({
      entitlementSource: input.source,
      brandedEmailEntitledAt: input.email ? effectiveAt : null,
      smsEntitledAt: input.sms ? effectiveAt : null,
      voiceEntitledAt: input.voice ? effectiveAt : null,
      emailState,
      smsState,
      voiceState,
      updatedAt: effectiveAt,
    })
    .where(
      eq(communicationServiceProfile.organizationId, input.organizationId),
    )
    .returning();
  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Communications entitlements could not be updated.",
    });
  }
  const queuedRelease = await reconcileEntitlementLifecycle(tx, {
    organizationId: input.organizationId,
    sms: input.sms,
    voice: input.voice,
    at: effectiveAt,
    graceDays: updated.numberReleaseGraceDays,
  });
  return { profile: updated, queuedRelease };
}

async function reconcileEntitlementLifecycle(
  tx: DeliveryTransaction,
  input: {
    organizationId: string;
    sms: boolean;
    voice: boolean;
    at: Date;
    graceDays: number | null;
  },
): Promise<boolean> {
  let queuedRelease = false;
  const phones = await tx
      .select()
      .from(twilioPhoneNumber)
      .where(
        and(
          eq(twilioPhoneNumber.organizationId, input.organizationId),
          inArray(twilioPhoneNumber.status, [
            "ACTIVE",
            "DEGRADED",
            "SUSPENDED",
            "RELEASE_SCHEDULED",
            "RELEASING",
          ]),
        ),
      );
  for (const phone of phones) {
      const remainsEntitled =
        (phone.smsEnabled && input.sms) ||
        (phone.voiceEnabled && input.voice);
      if (remainsEntitled) {
        await tx
          .update(communicationProvisioningOperation)
          .set({
            status: "CANCELLED",
            nextAttemptAt: null,
            claimToken: null,
            leaseExpiresAt: null,
            updatedAt: input.at,
          })
          .where(
            and(
              eq(communicationProvisioningOperation.phoneNumberId, phone.id),
              eq(
                communicationProvisioningOperation.service,
                "TWILIO_PHONE_RELEASE",
              ),
              inArray(communicationProvisioningOperation.status, [
                "PENDING",
                "PROCESSING",
                "RETRYABLE_FAILURE",
                "AMBIGUOUS",
              ]),
            ),
          );
        await tx
          .update(twilioPhoneNumber)
          .set({
            status:
              phone.status === "DEGRADED" || phone.status === "RELEASING"
                ? "DEGRADED"
                : "ACTIVE",
            suspendedAt: null,
            releaseScheduledAt: null,
            updatedAt: input.at,
          })
          .where(eq(twilioPhoneNumber.id, phone.id));
        continue;
      }
      const releaseAt =
        input.graceDays === null
          ? null
          : new Date(input.at.getTime() + input.graceDays * 86_400_000);
      await tx
        .update(twilioPhoneNumber)
        .set({
          status: releaseAt ? "RELEASE_SCHEDULED" : "SUSPENDED",
          isDefault: false,
          suspendedAt: phone.suspendedAt ?? input.at,
          releaseScheduledAt: releaseAt,
          updatedAt: input.at,
        })
        .where(eq(twilioPhoneNumber.id, phone.id));
      if (!releaseAt) continue;
      await tx
        .insert(communicationProvisioningOperation)
        .values({
          id: createId(),
          organizationId: input.organizationId,
          locationId: phone.locationId,
          providerAccountId: phone.providerAccountId,
          phoneNumberId: phone.id,
          service: "TWILIO_PHONE_RELEASE",
          operationType: "RELEASE",
          idempotencyKey: `twilio-number:entitlement-release:${phone.id}:${releaseAt.toISOString()}`,
          safeInput: {
            kind: "TWILIO_NUMBER_RELEASE",
            phoneNumberId: phone.id,
          },
          nextAttemptAt: releaseAt,
        })
        .onConflictDoNothing();
      queuedRelease = true;
  }
  return queuedRelease;
}

async function requestEntitlementReleaseProcessing(
  organizationId: string,
  at: Date,
): Promise<void> {
  await inngest.send({
    name: "communications/provisioning.requested",
    id: `communications-entitlement-release:${organizationId}:${at.getTime()}`,
    data: { organizationId },
  });
}

export async function requireCommunicationEntitlement(input: {
  organizationId: string;
  channel: CommunicationChannel;
}): Promise<CommunicationProfile> {
  const profile = applyTestingPlanAccess(
    await getOrCreateCommunicationProfile(input.organizationId),
  );
  const entitledAt = profile[ENTITLEMENT_FIELDS[input.channel]];
  const state = profile[STATE_FIELDS[input.channel]];
  if (!entitledAt || state === "SUSPENDED" || state === "RELEASED") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${input.channel.toLowerCase()} communications are not included in this workspace's active plan.`,
    });
  }
  return profile;
}
