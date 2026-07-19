import "server-only";

import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { Resend } from "resend";

import { db } from "@/db";
import {
  communicationProvisioningOperation,
  communicationServiceProfile,
  communicationUsageLedger,
  emailDomain,
  outboundDelivery,
  providerAccount,
  twilioPhoneNumber,
} from "@/db/schema";
import { inngest } from "@/inngest/client";
import { getCommunicationsPublicUrl } from "./platform-credentials";
import { getPlatformResendApiCredentials } from "./platform-credentials";
import { resolveTwilioPlatformAccount } from "./twilio-client";
import { applyTwilioSmsStatus } from "./twilio-sms-application";
import { requestDeliveryDispatch } from "@/features/delivery/server/request-dispatch";

const twilioCostSchema = z.object({
  price: z.string().regex(/^-?\d+(?:\.\d+)?$/),
  priceUnit: z.string().regex(/^[A-Za-z]{3}$/),
});

export async function recoverUnknownResendDeliveries(): Promise<number> {
  const cutoff = new Date(Date.now() - 5 * 60_000);
  const recovered = await db
    .update(outboundDelivery)
    .set({
      status: "QUEUED",
      availableAt: new Date(),
      claimToken: null,
      leaseExpiresAt: null,
      lastErrorCode: "RESEND_IDEMPOTENT_RETRY",
      lastErrorMessage:
        "Retrying an ambiguous Resend request with the original provider idempotency key.",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(outboundDelivery.provider, "RESEND"),
        eq(outboundDelivery.status, "UNKNOWN"),
        isNull(outboundDelivery.providerMessageId),
        lt(outboundDelivery.updatedAt, cutoff),
      ),
    )
    .returning({ organizationId: outboundDelivery.organizationId });
  for (const organizationId of new Set(
    recovered.map((delivery) => delivery.organizationId),
  )) {
    await requestDeliveryDispatch(organizationId);
  }
  return recovered.length;
}

export async function markStaleEmailDomains(): Promise<number> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 24 * 60 * 60_000);
  const domains = await db
    .select()
    .from(emailDomain)
    .where(
      and(
        eq(emailDomain.ownershipMode, "PLATFORM_MANAGED"),
        eq(emailDomain.lifecycleState, "ACTIVE"),
        eq(emailDomain.isDisabled, false),
        isNull(emailDomain.removedAt),
        isNotNull(emailDomain.providerAccountId),
        isNotNull(emailDomain.resendDomainId),
        or(
          isNull(emailDomain.lastCheckedAt),
          lt(emailDomain.lastCheckedAt, staleBefore),
        ),
      ),
    )
    .limit(100);
  if (domains.length === 0) return 0;
  await db.transaction(async (tx) => {
    for (const domain of domains) {
      if (!domain.providerAccountId) continue;
      await tx
        .update(emailDomain)
        .set({
          lifecycleState: "DEGRADED",
          verificationStaleAt: now,
          lastErrorCode: "DOMAIN_VERIFICATION_STALE",
          lastErrorMessage: "Domain verification is being refreshed.",
          updatedAt: now,
        })
        .where(
          and(
            eq(emailDomain.id, domain.id),
            eq(emailDomain.organizationId, domain.organizationId),
          ),
        );
      await tx
        .insert(communicationProvisioningOperation)
        .values({
          id: createId(),
          organizationId: domain.organizationId,
          locationId: domain.locationId,
          providerAccountId: domain.providerAccountId,
          emailDomainId: domain.id,
          service: "RESEND_DOMAIN",
          operationType: "REFRESH",
          idempotencyKey: `resend-domain:stale-refresh:${domain.id}:${now.toISOString().slice(0, 13)}`,
          safeInput: {
            kind: "RESEND_DOMAIN_REFRESH",
            emailDomainId: domain.id,
          },
          nextAttemptAt: now,
        })
        .onConflictDoNothing();
    }
  });
  for (const organizationId of new Set(
    domains.map((item) => item.organizationId),
  )) {
    await inngest.send({
      name: "communications/provisioning.requested",
      id: `communications-domain-stale:${organizationId}:${now.getTime()}`,
      data: { organizationId },
    });
  }
  return domains.length;
}

export async function reconcileTwilioResources(): Promise<number> {
  const accounts = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.provider, "TWILIO"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
        inArray(providerAccount.status, ["ACTIVE", "DEGRADED"]),
      ),
    )
    .limit(25);
  const expectedSmsUrl = `${getCommunicationsPublicUrl()}/api/webhooks/twilio/sms/inbound`;
  const expectedVoiceUrl = `${getCommunicationsPublicUrl()}/api/webhooks/twilio/voice/inbound`;
  const expectedVoiceStatusUrl = `${getCommunicationsPublicUrl()}/api/webhooks/twilio/voice/status`;
  let checked = 0;
  for (const account of accounts) {
    try {
      const binding = await resolveTwilioPlatformAccount({
        organizationId: account.organizationId,
        allowProvisioning: true,
      });
      if (!binding.client || binding.account.id !== account.id) continue;
      const remoteNumbers = await binding.client.incomingPhoneNumbers.list({
        limit: 1000,
      });
      const remoteBySid = new Map(
        remoteNumbers.map((number) => [number.sid, number]),
      );
      const localNumbers = await db
        .select()
        .from(twilioPhoneNumber)
        .where(
          and(
            eq(twilioPhoneNumber.organizationId, account.organizationId),
            eq(twilioPhoneNumber.providerAccountId, account.id),
            inArray(twilioPhoneNumber.status, [
              "ACTIVE",
              "DEGRADED",
              "RELEASE_SCHEDULED",
              "RELEASING",
            ]),
          ),
        );
      for (const local of localNumbers) {
        const remote = remoteBySid.get(local.providerPhoneNumberId);
        if (
          !remote &&
          ["RELEASE_SCHEDULED", "RELEASING"].includes(local.status)
        ) {
          await db
            .update(twilioPhoneNumber)
            .set({
              status: "RELEASED",
              isDefault: false,
              releasedAt: new Date(),
              lastHealthCheckAt: new Date(),
              lastErrorCode: null,
              lastErrorMessage: null,
              updatedAt: new Date(),
            })
            .where(eq(twilioPhoneNumber.id, local.id));
          continue;
        }
        if (["RELEASE_SCHEDULED", "RELEASING"].includes(local.status)) {
          continue;
        }
        let messagingServiceHealthy = !local.smsEnabled;
        if (local.smsEnabled) {
          if (local.messagingServiceSid) {
            await binding.client.messaging.v1
              .services(local.messagingServiceSid)
              .fetch();
            const senders = await binding.client.messaging.v1
              .services(local.messagingServiceSid)
              .phoneNumbers.list({ limit: 1000 });
            messagingServiceHealthy = senders.some(
              (sender) => sender.sid === local.providerPhoneNumberId,
            );
          } else {
            messagingServiceHealthy = local.complianceStatus === "NOT_REQUIRED";
          }
        }
        const healthy = Boolean(
          remote &&
          (!local.smsEnabled || remote.smsUrl === expectedSmsUrl) &&
          messagingServiceHealthy &&
          (!local.voiceEnabled ||
            (remote.voiceUrl === expectedVoiceUrl &&
              remote.statusCallback === expectedVoiceStatusUrl)),
        );
        await db
          .update(twilioPhoneNumber)
          .set({
            status: healthy ? "ACTIVE" : "DEGRADED",
            lastHealthCheckAt: new Date(),
            lastErrorCode: healthy ? null : "TWILIO_NUMBER_DRIFT",
            lastErrorMessage: healthy
              ? null
              : "The provider number or webhook configuration differs from Aurea.",
            updatedAt: new Date(),
          })
          .where(eq(twilioPhoneNumber.id, local.id));
      }
      await db
        .update(providerAccount)
        .set({
          status: "ACTIVE",
          lastHealthCheckAt: new Date(),
          lastSuccessAt: new Date(),
          lastErrorCode: null,
          updatedAt: new Date(),
        })
        .where(eq(providerAccount.id, account.id));
      checked += 1;
    } catch (error) {
      await db
        .update(providerAccount)
        .set({
          status: "DEGRADED",
          lastHealthCheckAt: new Date(),
          lastErrorCode: "TWILIO_RECONCILIATION_FAILED",
          updatedAt: new Date(),
        })
        .where(eq(providerAccount.id, account.id));
      console.error("Twilio reconciliation failed", {
        providerAccountId: account.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  return checked;
}

export async function reconcileResendPlatformHealth(): Promise<number> {
  const accounts = await db
    .select({ id: providerAccount.id })
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.provider, "RESEND"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
      ),
    );
  if (accounts.length === 0) return 0;
  const now = new Date();
  let unavailable = false;
  try {
    const credentials = getPlatformResendApiCredentials();
    const response = await new Resend(credentials.apiKey).domains.list({
      limit: 1,
    });
    unavailable = Boolean(response.error);
  } catch (error) {
    unavailable = true;
    console.error("Resend platform health check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
  await db
    .update(providerAccount)
    .set({
      status: unavailable ? "DEGRADED" : "ACTIVE",
      lastHealthCheckAt: now,
      lastSuccessAt: unavailable ? undefined : now,
      lastErrorCode: unavailable ? "RESEND_PLATFORM_UNAVAILABLE" : null,
      updatedAt: now,
    })
    .where(
      inArray(
        providerAccount.id,
        accounts.map((account) => account.id),
      ),
    );
  return accounts.length;
}

export async function projectCommunicationChannelHealth(): Promise<number> {
  const projected = await db
    .update(communicationServiceProfile)
    .set({
      emailState: sql`CASE
        WHEN ${communicationServiceProfile.brandedEmailEntitledAt} IS NULL THEN ${communicationServiceProfile.emailState}
        WHEN EXISTS (
          SELECT 1 FROM "EmailDomain" domain
          WHERE domain."organizationId" = ${communicationServiceProfile.organizationId}
            AND domain."status" = 'VERIFIED'
            AND domain."lifecycleState" = 'ACTIVE'
            AND domain."isDisabled" = false
            AND domain."removedAt" IS NULL
        ) THEN 'ACTIVE'::"CommunicationChannelState"
        WHEN EXISTS (
          SELECT 1 FROM "EmailDomain" domain
          WHERE domain."organizationId" = ${communicationServiceProfile.organizationId}
            AND domain."lifecycleState" IN ('DEGRADED', 'FAILED')
        ) THEN 'DEGRADED'::"CommunicationChannelState"
        ELSE 'PROVISIONING'::"CommunicationChannelState" END`,
      smsState: sql`CASE
        WHEN ${communicationServiceProfile.smsEntitledAt} IS NULL THEN ${communicationServiceProfile.smsState}
        WHEN ${communicationServiceProfile.smsState} = 'SUSPENDED' THEN ${communicationServiceProfile.smsState}
        WHEN EXISTS (
          SELECT 1 FROM "TwilioPhoneNumber" phone
          WHERE phone."organizationId" = ${communicationServiceProfile.organizationId}
            AND phone."smsEnabled" = true AND phone."status" = 'ACTIVE'
        ) THEN 'ACTIVE'::"CommunicationChannelState"
        WHEN EXISTS (
          SELECT 1 FROM "TwilioPhoneNumber" phone
          WHERE phone."organizationId" = ${communicationServiceProfile.organizationId}
            AND phone."smsEnabled" = true AND phone."status" IN ('DEGRADED', 'FAILED')
        ) THEN 'DEGRADED'::"CommunicationChannelState"
        ELSE 'PROVISIONING'::"CommunicationChannelState" END`,
      voiceState: sql`CASE
        WHEN ${communicationServiceProfile.voiceEntitledAt} IS NULL THEN ${communicationServiceProfile.voiceState}
        WHEN ${communicationServiceProfile.voiceState} = 'SUSPENDED' THEN ${communicationServiceProfile.voiceState}
        WHEN EXISTS (
          SELECT 1 FROM "TwilioPhoneNumber" phone
          WHERE phone."organizationId" = ${communicationServiceProfile.organizationId}
            AND phone."voiceEnabled" = true AND phone."status" = 'ACTIVE'
        ) THEN 'ACTIVE'::"CommunicationChannelState"
        WHEN EXISTS (
          SELECT 1 FROM "TwilioPhoneNumber" phone
          WHERE phone."organizationId" = ${communicationServiceProfile.organizationId}
            AND phone."voiceEnabled" = true AND phone."status" IN ('DEGRADED', 'FAILED')
        ) THEN 'DEGRADED'::"CommunicationChannelState"
        ELSE 'PROVISIONING'::"CommunicationChannelState" END`,
      updatedAt: new Date(),
    })
    .returning({ id: communicationServiceProfile.id });
  return projected.length;
}

export async function reconcileTwilioSmsCosts(): Promise<number> {
  const deliveries = await db
    .select()
    .from(outboundDelivery)
    .where(
      and(
        eq(outboundDelivery.provider, "TWILIO"),
        isNotNull(outboundDelivery.providerMessageId),
        inArray(outboundDelivery.status, [
          "ACCEPTED",
          "DELIVERED",
          "BOUNCED",
          "UNKNOWN",
        ]),
        sql`NOT EXISTS (
          SELECT 1
          FROM "CommunicationUsageLedger" AS sms_cost
          WHERE sms_cost."organizationId" = ${outboundDelivery.organizationId}
            AND sms_cost."deliveryId" = ${outboundDelivery.id}
            AND sms_cost."entryKind" = 'USAGE'
            AND sms_cost."resourceType" = 'SMS_SEGMENT'
            AND sms_cost."metadata" ? 'costPendingReconciliation'
            AND sms_cost."metadata" ->> 'costPendingReconciliation' = 'false'
        )`,
      ),
    )
    .limit(50);
  let reconciled = 0;
  for (const delivery of deliveries) {
    if (!delivery.providerMessageId || !delivery.providerAccountId) continue;
    const binding = await resolveTwilioPlatformAccount({
      organizationId: delivery.organizationId,
    });
    if (!binding.client || binding.account.id !== delivery.providerAccountId) {
      continue;
    }
    const message = await binding.client
      .messages(delivery.providerMessageId)
      .fetch();
    if (
      !["delivered", "failed", "undelivered", "canceled"].includes(
        message.status,
      )
    ) {
      continue;
    }
    const identity = `reconcile:${message.sid}:${message.status}`;
    await applyTwilioSmsStatus({
      receiptId: identity,
      providerEventId: identity,
      providerAccountId: delivery.providerAccountId,
      organizationId: delivery.organizationId,
      payloadHash: createHash("sha256").update(identity).digest("hex"),
      occurredAt: message.dateUpdated ?? new Date(),
      event: {
        AccountSid: message.accountSid,
        MessageSid: message.sid,
        MessageStatus: message.status,
        ErrorCode: message.errorCode?.toString(),
        NumSegments: message.numSegments ?? undefined,
        Price: message.price ?? undefined,
        PriceUnit: message.priceUnit?.toUpperCase(),
      },
    });
    reconciled += 1;
  }
  return reconciled;
}

export async function reconcileTwilioInboundSmsCosts(): Promise<number> {
  const pending = await db
    .select()
    .from(communicationUsageLedger)
    .where(
      and(
        eq(communicationUsageLedger.provider, "TWILIO"),
        eq(communicationUsageLedger.entryKind, "USAGE"),
        eq(communicationUsageLedger.resourceType, "SMS_SEGMENT"),
        isNotNull(communicationUsageLedger.providerAccountId),
        isNotNull(communicationUsageLedger.providerResourceId),
        sql`${communicationUsageLedger.metadata} ->> 'direction' = 'INBOUND'`,
        sql`${communicationUsageLedger.metadata} ->> 'costPendingReconciliation' = 'true'`,
      ),
    )
    .limit(50);
  let reconciled = 0;
  for (const usage of pending) {
    if (!usage.providerAccountId || !usage.providerResourceId) continue;
    const binding = await resolveTwilioPlatformAccount({
      organizationId: usage.organizationId,
    });
    if (!binding.client || binding.account.id !== usage.providerAccountId) {
      continue;
    }
    const message = await binding.client
      .messages(usage.providerResourceId)
      .fetch();
    const cost = twilioCostSchema.safeParse({
      price: message.price,
      priceUnit: message.priceUnit,
    });
    if (!cost.success) continue;
    await db
      .update(communicationUsageLedger)
      .set({
        providerCost: cost.data.price.replace(/^-/, ""),
        currency: cost.data.priceUnit.toUpperCase(),
        metadata: {
          direction: "INBOUND",
          costPendingReconciliation: false,
          basis: "twilio-reconciliation",
        },
      })
      .where(eq(communicationUsageLedger.id, usage.id));
    reconciled += 1;
  }
  return reconciled;
}
