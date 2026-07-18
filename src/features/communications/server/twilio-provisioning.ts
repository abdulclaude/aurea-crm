import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  communicationPhoneNumberQuote,
  communicationProvisioningOperation,
  providerAccount,
  inboxRoute,
  twilioPhoneNumber,
  twilioComplianceRegistration,
} from "@/db/schema";
import { communicationProvisioningSafeInputSchema } from "@/features/communications/contracts";
import { encrypt } from "@/lib/encryption";
import { getCommunicationsPublicUrl } from "./platform-credentials";
import { requireCommunicationEntitlement } from "./profile-service";
import { CommunicationProvisioningError } from "./provisioning-error";
import { canonicalDecimal } from "@/features/communications/lib/policy";
import {
  getTwilioParentClient,
  resolveTwilioPlatformAccount,
} from "./twilio-client";

type Operation = typeof communicationProvisioningOperation.$inferSelect;

function providerHttpStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return null;
}

async function provisionSubaccount(operation: Operation, friendlyName: string) {
  if (!operation.providerAccountId) {
    throw new CommunicationProvisioningError(
      "TWILIO_BINDING_MISSING",
      "The Twilio operation is not linked to a provider binding.",
      false,
    );
  }
  const [binding] = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.id, operation.providerAccountId),
        eq(providerAccount.organizationId, operation.organizationId),
        eq(providerAccount.provider, "TWILIO"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
      ),
    )
    .limit(1);
  if (!binding) {
    throw new CommunicationProvisioningError(
      "TWILIO_BINDING_MISSING",
      "The managed Twilio binding no longer exists.",
      false,
    );
  }
  if (binding.externalAccountId && binding.encryptedSecret) {
    return { externalResourceId: binding.externalAccountId };
  }
  const parent = getTwilioParentClient();
  const existing = (await parent.api.v2010.accounts.list({ limit: 1000 })).find(
    (account) => account.friendlyName === friendlyName,
  );
  const account =
    existing ?? (await parent.api.v2010.accounts.create({ friendlyName }));
  if (!account.authToken) {
    throw new CommunicationProvisioningError(
      "TWILIO_SUBACCOUNT_TOKEN_MISSING",
      "Twilio did not return an authentication token for the subaccount.",
      false,
    );
  }
  await db
    .update(providerAccount)
    .set({
      externalAccountId: account.sid,
      encryptedSecret: encrypt(account.authToken),
      status: "ACTIVE",
      lastHealthCheckAt: new Date(),
      lastSuccessAt: new Date(),
      lastErrorCode: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(providerAccount.id, binding.id),
        eq(providerAccount.organizationId, operation.organizationId),
      ),
    );
  return { externalResourceId: account.sid };
}

async function purchaseNumber(operation: Operation, quoteId: string) {
  if (!operation.phoneNumberId || !operation.providerAccountId) {
    throw new CommunicationProvisioningError(
      "TWILIO_NUMBER_REFERENCE_MISSING",
      "The purchase operation is missing its phone-number binding.",
      false,
    );
  }
  const [phone] = await db
    .select()
    .from(twilioPhoneNumber)
    .where(
      and(
        eq(twilioPhoneNumber.id, operation.phoneNumberId),
        eq(twilioPhoneNumber.organizationId, operation.organizationId),
      ),
    )
    .limit(1);
  if (!phone) {
    throw new CommunicationProvisioningError(
      "TWILIO_PHONE_ROW_MISSING",
      "The pending phone number no longer exists.",
      false,
    );
  }
  if (phone.status === "ACTIVE" && phone.providerPhoneNumberId) {
    return { externalResourceId: phone.providerPhoneNumberId };
  }
  const [quote] = await db
    .select()
    .from(communicationPhoneNumberQuote)
    .where(
      and(
        eq(communicationPhoneNumberQuote.id, quoteId),
        eq(
          communicationPhoneNumberQuote.organizationId,
          operation.organizationId,
        ),
        eq(
          communicationPhoneNumberQuote.providerAccountId,
          operation.providerAccountId,
        ),
        isNull(communicationPhoneNumberQuote.consumedAt),
        gt(communicationPhoneNumberQuote.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!quote || quote.phoneNumber !== phone.phoneNumber) {
    throw new CommunicationProvisioningError(
      "TWILIO_QUOTE_EXPIRED",
      "The verified Twilio number quote expired or was already consumed.",
      false,
    );
  }
  if (quote.smsEnabled) {
    await requireCommunicationEntitlement({
      organizationId: operation.organizationId,
      channel: "SMS",
    });
  }
  if (quote.voiceEnabled) {
    await requireCommunicationEntitlement({
      organizationId: operation.organizationId,
      channel: "VOICE",
    });
  }
  const resolved = await resolveTwilioPlatformAccount({
    organizationId: operation.organizationId,
  });
  if (!resolved.client) {
    throw new CommunicationProvisioningError(
      "TWILIO_SUBACCOUNT_NOT_READY",
      "The managed Twilio subaccount is not ready.",
      true,
    );
  }
  const complianceRequired =
    quote.smsEnabled || quote.regulatoryRequirement !== "none";
  const compliance = complianceRequired
    ? await db.query.twilioComplianceRegistration.findFirst({
        where: and(
          eq(
            twilioComplianceRegistration.organizationId,
            operation.organizationId,
          ),
          eq(
            twilioComplianceRegistration.providerAccountId,
            operation.providerAccountId,
          ),
          eq(twilioComplianceRegistration.country, quote.country),
          eq(twilioComplianceRegistration.numberType, quote.numberType),
          eq(twilioComplianceRegistration.status, "APPROVED"),
          quote.smsEnabled && quote.voiceEnabled
            ? eq(twilioComplianceRegistration.channel, "BOTH")
            : quote.smsEnabled
              ? or(
                  eq(twilioComplianceRegistration.channel, "SMS"),
                  eq(twilioComplianceRegistration.channel, "BOTH"),
                )
              : or(
                  eq(twilioComplianceRegistration.channel, "VOICE"),
                  eq(twilioComplianceRegistration.channel, "BOTH"),
                ),
        ),
      })
    : null;
  if (complianceRequired && !compliance) {
    throw new CommunicationProvisioningError(
      "TWILIO_COMPLIANCE_REQUIRED",
      "This number requires approved regulatory information before purchase.",
      false,
    );
  }
  const availableCountry = resolved.client.availablePhoneNumbers(quote.country);
  const availabilityOptions = {
    contains: quote.phoneNumber,
    smsEnabled: quote.smsEnabled || undefined,
    voiceEnabled: quote.voiceEnabled || undefined,
    limit: 20,
  };
  const available =
    quote.numberType === "mobile"
      ? await availableCountry.mobile.list(availabilityOptions)
      : quote.numberType === "tollFree"
        ? await availableCountry.tollFree.list(availabilityOptions)
        : await availableCountry.local.list(availabilityOptions);
  const stillAvailable = available.some(
    (candidate) =>
      candidate.phoneNumber === quote.phoneNumber &&
      (!quote.smsEnabled || candidate.capabilities.sms) &&
      (!quote.voiceEnabled || candidate.capabilities.voice),
  );
  const existing = (
    await resolved.client.incomingPhoneNumbers.list({
      phoneNumber: quote.phoneNumber,
      limit: 2,
    })
  )[0];
  if (!existing && !stillAvailable) {
    throw new CommunicationProvisioningError(
      "TWILIO_NUMBER_NO_LONGER_AVAILABLE",
      "The quoted phone number is no longer available with the requested capabilities.",
      false,
    );
  }
  const pricing = await resolved.client.pricing.v1.phoneNumbers
    .countries(quote.country)
    .fetch();
  const normalizedType = quote.numberType
    .toLowerCase()
    .replaceAll(/[^a-z]/g, "");
  const currentPrice = pricing.phoneNumberPrices.find((price) =>
    (price.numberType ?? "")
      .toLowerCase()
      .replaceAll(/[^a-z]/g, "")
      .includes(normalizedType),
  )?.currentPrice;
  if (
    currentPrice === undefined ||
    canonicalDecimal(currentPrice) !==
      canonicalDecimal(quote.monthlyProviderCost) ||
    pricing.priceUnit.toUpperCase() !== quote.currency
  ) {
    throw new CommunicationProvisioningError(
      "TWILIO_QUOTE_CHANGED",
      "Twilio pricing changed. Search again and confirm the new recurring cost.",
      false,
    );
  }
  const baseUrl = getCommunicationsPublicUrl();
  const number =
    existing ??
    (await resolved.client.incomingPhoneNumbers.create({
      phoneNumber: quote.phoneNumber,
      friendlyName: `Aurea ${operation.organizationId}`.slice(0, 64),
      smsMethod: "POST",
      smsUrl: `${baseUrl}/api/webhooks/twilio/sms/inbound`,
      voiceMethod: "POST",
      voiceUrl: `${baseUrl}/api/webhooks/twilio/voice/inbound`,
      addressSid: compliance?.addressSid ?? undefined,
      bundleSid: compliance?.bundleSid ?? undefined,
      identitySid: compliance?.identitySid ?? undefined,
    }));
  await resolved.client.incomingPhoneNumbers(number.sid).update({
    smsMethod: "POST",
    smsUrl: `${baseUrl}/api/webhooks/twilio/sms/inbound`,
    voiceMethod: "POST",
    voiceUrl: `${baseUrl}/api/webhooks/twilio/voice/inbound`,
    statusCallback: `${baseUrl}/api/webhooks/twilio/voice/status`,
    statusCallbackMethod: "POST",
  });
  if (quote.smsEnabled && compliance?.messagingServiceSid) {
    const serviceNumbers = await resolved.client.messaging.v1
      .services(compliance.messagingServiceSid)
      .phoneNumbers.list({ limit: 1000 });
    if (!serviceNumbers.some((sender) => sender.sid === number.sid)) {
      await resolved.client.messaging.v1
        .services(compliance.messagingServiceSid)
        .phoneNumbers.create({ phoneNumberSid: number.sid });
    }
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(twilioPhoneNumber)
      .set({
        providerPhoneNumberId: number.sid,
        complianceRegistrationId: compliance?.id ?? null,
        messagingServiceSid: compliance?.messagingServiceSid ?? null,
        status: "ACTIVE",
        purchaseConfirmedAt: phone.purchaseConfirmedAt ?? now,
        purchasedAt: now,
        webhooksConfiguredAt: now,
        lastHealthCheckAt: now,
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(twilioPhoneNumber.id, phone.id),
          eq(twilioPhoneNumber.organizationId, operation.organizationId),
        ),
      );
    await tx
      .update(communicationPhoneNumberQuote)
      .set({ consumedAt: now })
      .where(eq(communicationPhoneNumberQuote.id, quote.id));
    if (quote.smsEnabled) {
      const [existingRoute] = await tx
        .select({ id: inboxRoute.id })
        .from(inboxRoute)
        .where(
          and(
            eq(inboxRoute.providerAccountId, operation.providerAccountId!),
            eq(inboxRoute.inboundAddressNormalized, quote.phoneNumber),
          ),
        )
        .limit(1);
      if (!existingRoute) {
        const [defaultRoute] = await tx
          .select({ id: inboxRoute.id })
          .from(inboxRoute)
          .where(
            and(
              eq(inboxRoute.organizationId, operation.organizationId),
              quote.locationId
                ? eq(inboxRoute.locationId, quote.locationId)
                : isNull(inboxRoute.locationId),
              eq(inboxRoute.channel, "SMS"),
              eq(inboxRoute.isDefault, true),
              eq(inboxRoute.isActive, true),
            ),
          )
          .limit(1);
        await tx.insert(inboxRoute).values({
          id: createId(),
          organizationId: operation.organizationId,
          locationId: quote.locationId,
          providerAccountId: operation.providerAccountId!,
          channel: "SMS",
          name: quote.phoneNumber,
          inboundAddress: quote.phoneNumber,
          inboundAddressNormalized: quote.phoneNumber,
          isDefault: !defaultRoute,
          isActive: true,
          createdByUserId: operation.requestedByUserId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  });
  return { externalResourceId: number.sid };
}

async function verifyCompliance(operation: Operation, registrationId: string) {
  if (!operation.providerAccountId) {
    throw new CommunicationProvisioningError(
      "TWILIO_BINDING_MISSING",
      "The compliance operation has no managed provider binding.",
      false,
    );
  }
  const registration = await db.query.twilioComplianceRegistration.findFirst({
    where: and(
      eq(twilioComplianceRegistration.id, registrationId),
      eq(twilioComplianceRegistration.organizationId, operation.organizationId),
      eq(
        twilioComplianceRegistration.providerAccountId,
        operation.providerAccountId,
      ),
    ),
  });
  if (!registration) {
    throw new CommunicationProvisioningError(
      "TWILIO_COMPLIANCE_NOT_FOUND",
      "The compliance registration no longer exists.",
      false,
    );
  }
  const resolved = await resolveTwilioPlatformAccount({
    organizationId: operation.organizationId,
  });
  if (!resolved.client) {
    throw new CommunicationProvisioningError(
      "TWILIO_SUBACCOUNT_NOT_READY",
      "The managed Twilio subaccount is not ready.",
      true,
    );
  }
  if (registration.addressSid) {
    await resolved.client.addresses(registration.addressSid).fetch();
  }
  let providerStatus = "resources-verified";
  if (registration.bundleSid) {
    const bundle = await resolved.client.numbers.v2.regulatoryCompliance
      .bundles(registration.bundleSid)
      .fetch();
    providerStatus = bundle.status;
    if (
      !["twilio-approved", "provisionally-approved"].includes(bundle.status)
    ) {
      await db
        .update(twilioComplianceRegistration)
        .set({
          status: bundle.status === "twilio-rejected" ? "REJECTED" : "PENDING",
          providerStatus: bundle.status,
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(twilioComplianceRegistration.id, registration.id));
      throw new CommunicationProvisioningError(
        bundle.status === "twilio-rejected"
          ? "TWILIO_COMPLIANCE_REJECTED"
          : "TWILIO_COMPLIANCE_PENDING",
        bundle.status === "twilio-rejected"
          ? "Twilio rejected the regulatory compliance bundle."
          : "Twilio is still reviewing the regulatory compliance bundle.",
        bundle.status !== "twilio-rejected",
      );
    }
  }
  if (registration.messagingServiceSid) {
    await resolved.client.messaging.v1
      .services(registration.messagingServiceSid)
      .fetch();
    if (registration.campaignSid) {
      const campaign = await resolved.client.messaging.v1
        .services(registration.messagingServiceSid)
        .usAppToPerson(registration.campaignSid)
        .fetch();
      providerStatus = campaign.campaignStatus;
      if (campaign.campaignStatus !== "VERIFIED") {
        await db
          .update(twilioComplianceRegistration)
          .set({
            status:
              campaign.campaignStatus === "FAILED" ? "REJECTED" : "PENDING",
            providerStatus: campaign.campaignStatus,
            lastCheckedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(twilioComplianceRegistration.id, registration.id));
        throw new CommunicationProvisioningError(
          campaign.campaignStatus === "FAILED"
            ? "TWILIO_CAMPAIGN_REJECTED"
            : "TWILIO_CAMPAIGN_PENDING",
          campaign.campaignStatus === "FAILED"
            ? "Twilio rejected the messaging campaign."
            : "Twilio is still reviewing the messaging campaign.",
          campaign.campaignStatus !== "FAILED",
        );
      }
    }
  }
  if (!registration.bundleSid && !registration.messagingServiceSid) {
    throw new CommunicationProvisioningError(
      "TWILIO_COMPLIANCE_EVIDENCE_MISSING",
      "A provider bundle or messaging registration is required for approval.",
      false,
    );
  }
  await db
    .update(twilioComplianceRegistration)
    .set({
      status: "APPROVED",
      providerStatus,
      approvedAt: new Date(),
      lastCheckedAt: new Date(),
      lastErrorCode: null,
      lastErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(twilioComplianceRegistration.id, registration.id));
  return {
    externalResourceId:
      registration.bundleSid ??
      registration.campaignSid ??
      registration.messagingServiceSid,
  };
}

async function releaseNumber(operation: Operation, phoneNumberId: string) {
  const [phone] = await db
    .select()
    .from(twilioPhoneNumber)
    .where(
      and(
        eq(twilioPhoneNumber.id, phoneNumberId),
        eq(twilioPhoneNumber.organizationId, operation.organizationId),
      ),
    )
    .limit(1);
  if (!phone) {
    throw new CommunicationProvisioningError(
      "TWILIO_PHONE_ROW_MISSING",
      "The scheduled phone number no longer exists.",
      false,
    );
  }
  if (phone.status === "RELEASED") {
    return { externalResourceId: phone.providerPhoneNumberId };
  }
  if (
    phone.status !== "RELEASE_SCHEDULED" ||
    !phone.releaseScheduledAt ||
    phone.releaseScheduledAt > new Date()
  ) {
    throw new CommunicationProvisioningError(
      "TWILIO_NUMBER_RELEASE_NOT_DUE",
      "The phone number is not currently eligible for release.",
      false,
    );
  }
  const resolved = await resolveTwilioPlatformAccount({
    organizationId: operation.organizationId,
  });
  if (!resolved.client) {
    throw new CommunicationProvisioningError(
      "TWILIO_SUBACCOUNT_NOT_READY",
      "The managed Twilio subaccount is not ready.",
      true,
    );
  }
  const [releaseEligibility] = await db
    .update(twilioPhoneNumber)
    .set({ status: "RELEASING", updatedAt: new Date() })
    .where(
      and(
        eq(twilioPhoneNumber.id, phone.id),
        eq(twilioPhoneNumber.organizationId, operation.organizationId),
        eq(twilioPhoneNumber.status, "RELEASE_SCHEDULED"),
        sql`EXISTS (
          SELECT 1
          FROM "CommunicationProvisioningOperation" AS release_operation
          WHERE release_operation."id" = ${operation.id}
            AND release_operation."phoneNumberId" = ${phone.id}
            AND release_operation."organizationId" = ${operation.organizationId}
            AND release_operation."status" = 'PROCESSING'
            AND release_operation."claimToken" = ${operation.claimToken}
        )`,
      ),
    )
    .returning({ id: twilioPhoneNumber.id });
  if (!releaseEligibility) {
    throw new CommunicationProvisioningError(
      "TWILIO_NUMBER_RELEASE_CANCELLED",
      "The phone-number release was cancelled before provider execution.",
      false,
    );
  }
  const releaseClaimToken = operation.claimToken;
  if (!releaseClaimToken) {
    throw new CommunicationProvisioningError(
      "TWILIO_NUMBER_RELEASE_CLAIM_MISSING",
      "The phone-number release no longer owns its provisioning claim.",
      false,
    );
  }
  const [stillOwned] = await db
    .select({ id: communicationProvisioningOperation.id })
    .from(communicationProvisioningOperation)
    .where(
      and(
        eq(communicationProvisioningOperation.id, operation.id),
        eq(communicationProvisioningOperation.status, "PROCESSING"),
        eq(communicationProvisioningOperation.claimToken, releaseClaimToken),
      ),
    )
    .limit(1);
  if (!stillOwned) {
    await db
      .update(twilioPhoneNumber)
      .set({ status: "DEGRADED", updatedAt: new Date() })
      .where(
        and(
          eq(twilioPhoneNumber.id, phone.id),
          eq(twilioPhoneNumber.status, "RELEASING"),
        ),
      );
    throw new CommunicationProvisioningError(
      "TWILIO_NUMBER_RELEASE_CANCELLED",
      "The phone-number release was cancelled before provider execution.",
      false,
    );
  }
  if (phone.providerPhoneNumberId) {
    try {
      await resolved.client
        .incomingPhoneNumbers(phone.providerPhoneNumberId)
        .remove();
    } catch (error) {
      if (providerHttpStatus(error) !== 404) {
        await db
          .update(twilioPhoneNumber)
          .set({ status: "RELEASE_SCHEDULED", updatedAt: new Date() })
          .where(
            and(
              eq(twilioPhoneNumber.id, phone.id),
              eq(twilioPhoneNumber.status, "RELEASING"),
            ),
          );
        throw error;
      }
    }
  }
  await db
    .update(twilioPhoneNumber)
    .set({
      status: "RELEASED",
      isDefault: false,
      releasedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(twilioPhoneNumber.id, phone.id),
        eq(twilioPhoneNumber.status, "RELEASING"),
      ),
    );
  return { externalResourceId: phone.providerPhoneNumberId };
}

export async function runTwilioProvisioningOperation(operation: Operation) {
  const safeInput = communicationProvisioningSafeInputSchema.parse(
    operation.safeInput,
  );
  if (
    operation.service === "TWILIO_SUBACCOUNT" &&
    safeInput.kind === "TWILIO_SUBACCOUNT_CREATE"
  ) {
    return provisionSubaccount(operation, safeInput.friendlyName);
  }
  if (
    operation.service === "TWILIO_PHONE_NUMBER" &&
    safeInput.kind === "TWILIO_NUMBER_PURCHASE"
  ) {
    return purchaseNumber(operation, safeInput.quoteId);
  }
  if (
    operation.service === "TWILIO_PHONE_RELEASE" &&
    safeInput.kind === "TWILIO_NUMBER_RELEASE"
  ) {
    return releaseNumber(operation, safeInput.phoneNumberId);
  }
  if (
    operation.service === "TWILIO_COMPLIANCE" &&
    safeInput.kind === "TWILIO_COMPLIANCE_VERIFY"
  ) {
    return verifyCompliance(operation, safeInput.registrationId);
  }
  throw new CommunicationProvisioningError(
    "SERVICE_NOT_IMPLEMENTED",
    "The Twilio provisioning operation is not registered.",
    false,
  );
}
