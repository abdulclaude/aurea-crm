import "server-only";

import { createId } from "@paralleldrive/cuid2";
import {
  and,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  communicationProvisioningOperation,
  emailDomain,
  locationMember,
  member,
  notification,
  notificationPreference,
  staffIdentity,
} from "@/db/schema";
import {
  isNotificationEventEnabled,
  normalizeNotificationPreferences,
} from "@/features/notifications/lib/preferences";
import { isStaffIdentityAccessBlocked } from "@/features/staff-identities/lib/identity-policy";

const AUTO_REFRESH_INTERVAL_MS = 5 * 60_000;
const AUTO_REFRESH_BATCH_SIZE = 50;
const VERIFICATION_NOTIFICATION_TYPE = "EMAIL_DOMAIN_VERIFIED";
const ACTIVE_OPERATION_STATUSES = [
  "PENDING",
  "PROCESSING",
  "RETRYABLE_FAILURE",
  "AMBIGUOUS",
] as const;

type VerificationTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

type VerifiedDomain = Pick<
  typeof emailDomain.$inferSelect,
  "id" | "organizationId" | "locationId" | "domain"
>;

const organizationStaffIdentity = alias(
  staffIdentity,
  "verificationOrganizationStaffIdentity",
);
const locationStaffIdentity = alias(
  staffIdentity,
  "verificationLocationStaffIdentity",
);

export async function enqueueVerifyingEmailDomainRefreshes(): Promise<{
  queued: number;
}> {
  const now = new Date();
  const refreshBefore = new Date(now.getTime() - AUTO_REFRESH_INTERVAL_MS);
  const bucket = Math.floor(now.getTime() / AUTO_REFRESH_INTERVAL_MS);
  const domains = await db
    .select({
      id: emailDomain.id,
      organizationId: emailDomain.organizationId,
      locationId: emailDomain.locationId,
      providerAccountId: emailDomain.providerAccountId,
    })
    .from(emailDomain)
    .where(
      and(
        eq(emailDomain.status, "VERIFYING"),
        eq(emailDomain.isDisabled, false),
        isNull(emailDomain.removedAt),
        isNotNull(emailDomain.resendDomainId),
        isNotNull(emailDomain.providerAccountId),
        or(
          isNull(emailDomain.lastCheckedAt),
          lte(emailDomain.lastCheckedAt, refreshBefore),
        ),
        notExists(
          db
            .select({ value: sql`1` })
            .from(communicationProvisioningOperation)
            .where(
              and(
                eq(
                  communicationProvisioningOperation.organizationId,
                  emailDomain.organizationId,
                ),
                eq(
                  communicationProvisioningOperation.emailDomainId,
                  emailDomain.id,
                ),
                eq(communicationProvisioningOperation.operationType, "REFRESH"),
                inArray(
                  communicationProvisioningOperation.status,
                  ACTIVE_OPERATION_STATUSES,
                ),
              ),
            ),
        ),
      ),
    )
    .limit(AUTO_REFRESH_BATCH_SIZE);

  if (domains.length === 0) return { queued: 0 };

  const queued = await db
    .insert(communicationProvisioningOperation)
    .values(
      domains.map((domain) => ({
        id: createId(),
        organizationId: domain.organizationId,
        locationId: domain.locationId,
        providerAccountId: domain.providerAccountId,
        emailDomainId: domain.id,
        service: "RESEND_DOMAIN" as const,
        operationType: "REFRESH" as const,
        idempotencyKey: `resend-domain:verification-refresh:${domain.id}:${bucket}`,
        safeInput: {
          kind: "RESEND_DOMAIN_REFRESH",
          emailDomainId: domain.id,
        },
        nextAttemptAt: now,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: communicationProvisioningOperation.id });

  return { queued: queued.length };
}

export async function insertEmailDomainVerifiedNotifications(
  tx: VerificationTransaction,
  domain: VerifiedDomain,
): Promise<number> {
  const organizationRecipients = await tx
    .select({
      userId: member.userId,
      identityStatus: organizationStaffIdentity.status,
      preferences: notificationPreference.preferences,
    })
    .from(member)
    .leftJoin(
      organizationStaffIdentity,
      eq(organizationStaffIdentity.id, member.staffIdentityId),
    )
    .leftJoin(
      notificationPreference,
      eq(notificationPreference.userId, member.userId),
    )
    .where(
      and(
        eq(member.organizationId, domain.organizationId),
        inArray(member.role, ["owner", "admin"]),
      ),
    );

  const locationRecipients = domain.locationId
    ? await tx
        .select({
          userId: locationMember.userId,
          organizationIdentityStatus: organizationStaffIdentity.status,
          locationIdentityStatus: locationStaffIdentity.status,
          preferences: notificationPreference.preferences,
        })
        .from(locationMember)
        .leftJoin(
          member,
          and(
            eq(member.organizationId, domain.organizationId),
            eq(member.userId, locationMember.userId),
          ),
        )
        .leftJoin(
          organizationStaffIdentity,
          eq(organizationStaffIdentity.id, member.staffIdentityId),
        )
        .leftJoin(
          locationStaffIdentity,
          eq(locationStaffIdentity.id, locationMember.staffIdentityId),
        )
        .leftJoin(
          notificationPreference,
          eq(notificationPreference.userId, locationMember.userId),
        )
        .where(
          and(
            eq(locationMember.locationId, domain.locationId),
            inArray(locationMember.role, ["AGENCY", "ADMIN"]),
          ),
        )
    : [];

  const recipients = new Set<string>();
  for (const recipient of organizationRecipients) {
    if (
      !isStaffIdentityAccessBlocked([recipient.identityStatus]) &&
      isNotificationEventEnabled(
        normalizeNotificationPreferences(recipient.preferences),
        VERIFICATION_NOTIFICATION_TYPE,
      )
    ) {
      recipients.add(recipient.userId);
    }
  }
  for (const recipient of locationRecipients) {
    if (
      !isStaffIdentityAccessBlocked([
        recipient.organizationIdentityStatus,
        recipient.locationIdentityStatus,
      ]) &&
      isNotificationEventEnabled(
        normalizeNotificationPreferences(recipient.preferences),
        VERIFICATION_NOTIFICATION_TYPE,
      )
    ) {
      recipients.add(recipient.userId);
    }
  }

  if (recipients.size === 0) return 0;

  const createdAt = new Date();
  const inserted = await tx
    .insert(notification)
    .values(
      [...recipients].map((userId) => ({
        id: buildDomainVerificationNotificationId(domain.id, userId),
        userId,
        organizationId: domain.organizationId,
        locationId: domain.locationId,
        type: VERIFICATION_NOTIFICATION_TYPE,
        title: "Email domain verified",
        message: `${domain.domain} is verified and ready to send email.`,
        data: {
          domainId: domain.id,
          domain: domain.domain,
          href: "/settings/communications/email",
        },
        entityType: "email-domain",
        entityId: domain.id,
        createdAt,
      })),
    )
    .onConflictDoNothing({ target: notification.id })
    .returning({ id: notification.id });

  return inserted.length;
}

export function buildDomainVerificationNotificationId(
  domainId: string,
  userId: string,
): string {
  return `email-domain-verified:${domainId}:${userId}`;
}
