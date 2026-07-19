import "server-only";

import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { emailDomain, emailSenderAddress } from "@/db/schema";
import type { DeliveryPurpose } from "@/features/delivery/contracts";
import { normalizeEmailDestination } from "@/features/delivery/lib/normalization";
import type { DeliverySenderRef } from "@/features/delivery/lib/payload-schemas";
import { selectApprovedEmailSender } from "@/features/delivery/server/email-sender-policy";
import { resolveProviderAccount } from "@/features/provider-accounts/server/resolver";
import { getPlatformResendSenderDefaults } from "@/features/communications/server/platform-credentials";
import { getOrCreateCommunicationProfile, requireCommunicationEntitlement } from "@/features/communications/server/profile-service";
import { ensurePlatformResendBinding } from "@/features/communications/server/resend-binding";

type ResolveEmailSenderInput = {
  organizationId: string;
  locationId: string | null;
  emailDomainId?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
  senderAddressId?: string;
  purpose: DeliveryPurpose;
};

export type ResolvedEmailSender = {
  providerAccountRef: string;
  sender: Extract<DeliverySenderRef, { kind: "EMAIL_DOMAIN" }>;
};

export async function resolveEmailSender(
  input: ResolveEmailSenderInput,
): Promise<ResolvedEmailSender> {
  const locationScope = input.locationId
    ? or(
        eq(emailDomain.locationId, input.locationId),
        isNull(emailDomain.locationId),
      )
    : isNull(emailDomain.locationId);

  const [selectedSender] = input.senderAddressId
    ? await db
        .select({
          senderAddressId: emailSenderAddress.id,
          email: emailSenderAddress.email,
          displayName: emailSenderAddress.displayName,
          replyTo: emailSenderAddress.replyTo,
          isDefault: emailSenderAddress.isDefault,
          isDisabled: emailSenderAddress.isDisabled,
          removedAt: emailSenderAddress.removedAt,
          id: emailDomain.id,
          providerAccountId: emailDomain.providerAccountId,
          domain: emailDomain.domain,
          defaultFromName: emailDomain.defaultFromName,
          defaultFromEmail: emailDomain.defaultFromEmail,
          defaultReplyTo: emailDomain.defaultReplyTo,
          locationId: emailDomain.locationId,
        })
        .from(emailSenderAddress)
        .innerJoin(
          emailDomain,
          and(
            eq(emailDomain.id, emailSenderAddress.emailDomainId),
            eq(emailDomain.organizationId, emailSenderAddress.organizationId),
          ),
        )
        .where(
          and(
            eq(emailSenderAddress.id, input.senderAddressId),
            eq(emailSenderAddress.organizationId, input.organizationId),
            input.locationId
              ? or(
                  eq(emailSenderAddress.locationId, input.locationId),
                  isNull(emailSenderAddress.locationId),
                )
              : isNull(emailSenderAddress.locationId),
            eq(emailSenderAddress.isDisabled, false),
            isNull(emailSenderAddress.removedAt),
            locationScope,
            eq(emailDomain.status, "VERIFIED"),
            eq(emailDomain.lifecycleState, "ACTIVE"),
            eq(emailDomain.isDisabled, false),
            isNull(emailDomain.verificationStaleAt),
            isNull(emailDomain.removedAt),
          ),
        )
        .limit(1)
    : [undefined];
  if (input.senderAddressId && !selectedSender) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The selected sender address is not available in this workspace.",
    });
  }

  const [defaultDomain] = selectedSender
    ? [undefined]
    : await db
        .select({
          id: emailDomain.id,
          providerAccountId: emailDomain.providerAccountId,
          domain: emailDomain.domain,
          defaultFromName: emailDomain.defaultFromName,
          defaultFromEmail: emailDomain.defaultFromEmail,
          defaultReplyTo: emailDomain.defaultReplyTo,
          locationId: emailDomain.locationId,
        })
        .from(emailDomain)
        .where(
          and(
            eq(emailDomain.organizationId, input.organizationId),
            locationScope,
            eq(emailDomain.status, "VERIFIED"),
            eq(emailDomain.lifecycleState, "ACTIVE"),
            eq(emailDomain.isDisabled, false),
            isNull(emailDomain.verificationStaleAt),
            isNull(emailDomain.removedAt),
            input.emailDomainId
              ? eq(emailDomain.id, input.emailDomainId)
              : undefined,
          ),
        )
        .orderBy(
          desc(emailDomain.isDefault),
          input.locationId
            ? sql`CASE WHEN ${emailDomain.locationId} = ${input.locationId} THEN 0 ELSE 1 END`
            : sql`0`,
          desc(emailDomain.createdAt),
        )
        .limit(1);
  const domain = selectedSender ?? defaultDomain;

  if (input.emailDomainId && !domain) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The selected email domain is not verified for this workspace.",
    });
  }

  if (domain) {
    await requireCommunicationEntitlement({
      organizationId: input.organizationId,
      channel: "EMAIL",
    });
    if (!domain.providerAccountId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Link the email domain to a Resend account before sending.",
      });
    }
    await resolveProviderAccount({
      providerAccountId: domain.providerAccountId,
      provider: "RESEND",
      scope: {
        organizationId: input.organizationId,
        locationId: input.locationId,
      },
    });
    const approvedAddress = selectedSender
      ? selectedSender
      : selectApprovedEmailSender(
          await db.query.emailSenderAddress.findMany({
            where: and(
              eq(emailSenderAddress.organizationId, input.organizationId),
              domain.locationId
                ? eq(emailSenderAddress.locationId, domain.locationId)
                : isNull(emailSenderAddress.locationId),
              eq(emailSenderAddress.emailDomainId, domain.id),
              eq(emailSenderAddress.isDisabled, false),
              isNull(emailSenderAddress.removedAt),
            ),
          }),
          input.fromEmail
            ? normalizeEmailDestination(input.fromEmail)
            : null,
        );
    if (!approvedAddress) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Select an active approved sender address for this email domain.",
      });
    }

    return {
      providerAccountRef: domain.providerAccountId,
      sender: {
        kind: "EMAIL_DOMAIN",
        id: domain.id,
        fromName: approvedAddress.displayName,
        fromEmail: approvedAddress.email,
        replyTo: approvedAddress.replyTo ?? undefined,
      },
    };
  }

  if (input.purpose === "MARKETING" || input.purpose === "ONE_TO_ONE") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Verify and select a branded email domain before sending marketing or one-to-one email.",
    });
  }
  const profile = await getOrCreateCommunicationProfile(input.organizationId);
  if (!profile.fallbackEmailEnabled) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Managed fallback email is disabled for this workspace.",
    });
  }
  const binding = await ensurePlatformResendBinding({
    organizationId: input.organizationId,
  });
  const account = await resolveProviderAccount({
    providerAccountId: binding.id,
    provider: "RESEND",
    scope: {
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
  });
  const fallback = getPlatformResendSenderDefaults();
  const configuredFrom =
    account.config.defaultFromEmail ?? fallback.fallbackFromEmail;
  if (!configuredFrom) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Configure a default sender on the Resend account before sending.",
    });
  }

  const normalizedSystemFrom = normalizeEmailDestination(configuredFrom);
  const requestedFrom = input.fromEmail
    ? normalizeEmailDestination(input.fromEmail)
    : normalizedSystemFrom;
  const systemDomain = normalizedSystemFrom.split("@")[1];
  if (!systemDomain || !requestedFrom.endsWith(`@${systemDomain}`)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The sender address must use the configured system domain.",
    });
  }

  const fallbackFromName =
    account.config.defaultFromName ?? fallback.fallbackFromName;
  if (!fallbackFromName) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Configure a platform fallback sender name before sending system email.",
    });
  }

  return {
    providerAccountRef: account.id,
    sender: {
      kind: "EMAIL_DOMAIN",
      id: account.id,
      fromName:
        input.fromName ??
        fallbackFromName,
      fromEmail: requestedFrom,
      replyTo: input.replyTo
        ? normalizeEmailDestination(input.replyTo)
        : (account.config.defaultReplyTo ?? fallback.fallbackReplyTo),
    },
  };
}
