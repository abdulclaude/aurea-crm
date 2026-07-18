import "server-only";

import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { emailDomain } from "@/db/schema";
import type { DeliveryPurpose } from "@/features/delivery/contracts";
import { normalizeEmailDestination } from "@/features/delivery/lib/normalization";
import type { DeliverySenderRef } from "@/features/delivery/lib/payload-schemas";
import { resolveProviderAccount } from "@/features/provider-accounts/server/resolver";
import { getPlatformResendCredentials } from "@/features/communications/server/platform-credentials";
import { getOrCreateCommunicationProfile, requireCommunicationEntitlement } from "@/features/communications/server/profile-service";
import { ensurePlatformResendBinding } from "@/features/communications/server/resend-binding";

type ResolveEmailSenderInput = {
  organizationId: string;
  locationId: string | null;
  emailDomainId?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
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

  const [domain] = await db
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
    const fromEmail = normalizeEmailDestination(
      input.fromEmail ?? domain.defaultFromEmail ?? `noreply@${domain.domain}`,
    );
    if (!fromEmail.endsWith(`@${domain.domain.toLowerCase()}`)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "The sender address must use the selected verified domain.",
      });
    }

    return {
      providerAccountRef: domain.providerAccountId,
      sender: {
        kind: "EMAIL_DOMAIN",
        id: domain.id,
        fromName: input.fromName ?? domain.defaultFromName ?? undefined,
        fromEmail,
        replyTo: input.replyTo ?? domain.defaultReplyTo ?? undefined,
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
  const fallback = getPlatformResendCredentials();
  const configuredFrom = account.config.defaultFromEmail ?? fallback.fallbackFromEmail;
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

  return {
    providerAccountRef: account.id,
    sender: {
      kind: "EMAIL_DOMAIN",
      id: account.id,
      fromName:
        input.fromName ??
        account.config.defaultFromName ??
        fallback.fallbackFromName,
      fromEmail: requestedFrom,
      replyTo: input.replyTo
        ? normalizeEmailDestination(input.replyTo)
        : (account.config.defaultReplyTo ?? fallback.fallbackReplyTo),
    },
  };
}
