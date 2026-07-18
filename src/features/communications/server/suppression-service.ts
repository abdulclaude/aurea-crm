import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, ilike, isNull, lt, or } from "drizzle-orm";

import { db } from "@/db";
import {
  communicationSuppression,
  mailboxBlocklistEntry,
} from "@/db/schema";
import { normalizeMailboxBlocklistValue } from "@/features/communications/lib/mailbox-blocklist";
import type {
  CommunicationSuppressionScope,
  DeliveryChannel,
} from "@/features/delivery/contracts";
import { normalizeDeliveryDestination } from "@/features/delivery/lib/normalization";

export type CommunicationControlScope = {
  organizationId: string;
  locationId: string | null;
};

function exactLocationCondition(
  locationId: string | null,
  column:
    | typeof communicationSuppression.locationId
    | typeof mailboxBlocklistEntry.locationId,
) {
  return locationId ? eq(column, locationId) : isNull(column);
}

function escapedPattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}

function activeCondition(
  revokedAt:
    | typeof communicationSuppression.revokedAt
    | typeof mailboxBlocklistEntry.revokedAt,
  expiresAt:
    | typeof communicationSuppression.expiresAt
    | typeof mailboxBlocklistEntry.expiresAt,
  now: Date,
) {
  return and(isNull(revokedAt), or(isNull(expiresAt), gt(expiresAt, now)));
}

export async function listCommunicationSuppressions(input: {
  scope: CommunicationControlScope;
  query: string;
  includeInactive: boolean;
  limit: number;
}) {
  const now = new Date();
  return db
    .select({
      id: communicationSuppression.id,
      channel: communicationSuppression.channel,
      scope: communicationSuppression.scope,
      reason: communicationSuppression.reason,
      destinationNormalized: communicationSuppression.destinationNormalized,
      activeAt: communicationSuppression.activeAt,
      expiresAt: communicationSuppression.expiresAt,
      revokedAt: communicationSuppression.revokedAt,
      createdAt: communicationSuppression.createdAt,
    })
    .from(communicationSuppression)
    .where(
      and(
        eq(communicationSuppression.organizationId, input.scope.organizationId),
        exactLocationCondition(input.scope.locationId, communicationSuppression.locationId),
        input.query
          ? ilike(communicationSuppression.destinationNormalized, escapedPattern(input.query))
          : undefined,
        input.includeInactive
          ? undefined
          : activeCondition(
              communicationSuppression.revokedAt,
              communicationSuppression.expiresAt,
              now,
            ),
      ),
    )
    .orderBy(desc(communicationSuppression.createdAt), desc(communicationSuppression.id))
    .limit(input.limit);
}

export async function createCommunicationSuppression(input: {
  scope: CommunicationControlScope;
  actorUserId: string;
  channel: DeliveryChannel;
  suppressionScope: CommunicationSuppressionScope;
  reason:
    | "UNSUBSCRIBE"
    | "COMPLAINT"
    | "HARD_BOUNCE"
    | "SMS_STOP"
    | "INVALID_DESTINATION"
    | "MANUAL";
  destination: string;
  expiresAt: Date | null;
}) {
  const now = new Date();
  if (input.expiresAt && input.expiresAt <= now) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Expiry must be in the future." });
  }
  const destinationNormalized = normalizeDeliveryDestination(input.channel, input.destination);
  const [entry] = await db.transaction(async (tx) => {
    await tx
      .update(communicationSuppression)
      .set({ revokedAt: now, revokedBy: input.actorUserId, updatedAt: now })
      .where(
        and(
          eq(communicationSuppression.organizationId, input.scope.organizationId),
          exactLocationCondition(input.scope.locationId, communicationSuppression.locationId),
          eq(communicationSuppression.channel, input.channel),
          eq(communicationSuppression.scope, input.suppressionScope),
          eq(communicationSuppression.destinationNormalized, destinationNormalized),
          isNull(communicationSuppression.revokedAt),
          lt(communicationSuppression.expiresAt, now),
        ),
      );
    return tx
      .insert(communicationSuppression)
      .values({
        id: createId(),
        ...input.scope,
        channel: input.channel,
        scope: input.suppressionScope,
        reason: input.reason,
        destinationNormalized,
        createdBy: input.actorUserId,
        expiresAt: input.expiresAt,
        activeAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();
  });
  if (!entry) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "An active suppression already exists for this destination and scope.",
    });
  }
  return entry;
}

export async function revokeCommunicationSuppression(input: {
  scope: CommunicationControlScope;
  actorUserId: string;
  id: string;
}) {
  const now = new Date();
  const [entry] = await db
    .update(communicationSuppression)
    .set({ revokedAt: now, revokedBy: input.actorUserId, updatedAt: now })
    .where(
      and(
        eq(communicationSuppression.id, input.id),
        eq(communicationSuppression.organizationId, input.scope.organizationId),
        exactLocationCondition(input.scope.locationId, communicationSuppression.locationId),
        isNull(communicationSuppression.revokedAt),
      ),
    )
    .returning();
  if (!entry) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Active suppression not found." });
  }
  return entry;
}

export async function listMailboxBlocklistEntries(input: {
  scope: CommunicationControlScope;
  query: string;
  includeInactive: boolean;
  limit: number;
}) {
  const now = new Date();
  return db
    .select()
    .from(mailboxBlocklistEntry)
    .where(
      and(
        eq(mailboxBlocklistEntry.organizationId, input.scope.organizationId),
        exactLocationCondition(input.scope.locationId, mailboxBlocklistEntry.locationId),
        input.query
          ? or(
              ilike(mailboxBlocklistEntry.valueNormalized, escapedPattern(input.query)),
              ilike(mailboxBlocklistEntry.reason, escapedPattern(input.query)),
            )
          : undefined,
        input.includeInactive
          ? undefined
          : activeCondition(
              mailboxBlocklistEntry.revokedAt,
              mailboxBlocklistEntry.expiresAt,
              now,
            ),
      ),
    )
    .orderBy(desc(mailboxBlocklistEntry.createdAt), desc(mailboxBlocklistEntry.id))
    .limit(input.limit);
}

export async function createMailboxBlocklistEntry(input: {
  scope: CommunicationControlScope;
  actorUserId: string;
  matchType: "ADDRESS" | "DOMAIN";
  value: string;
  reason: string;
  expiresAt: Date | null;
}) {
  const now = new Date();
  if (input.expiresAt && input.expiresAt <= now) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Expiry must be in the future." });
  }
  let valueNormalized: string;
  try {
    valueNormalized = normalizeMailboxBlocklistValue(input.matchType, input.value);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: input.matchType === "ADDRESS" ? "Enter a valid email address." : "Enter a valid domain.",
      cause: error,
    });
  }
  const [entry] = await db.transaction(async (tx) => {
    await tx
      .update(mailboxBlocklistEntry)
      .set({ revokedAt: now, revokedById: input.actorUserId, updatedAt: now })
      .where(
        and(
          eq(mailboxBlocklistEntry.organizationId, input.scope.organizationId),
          exactLocationCondition(input.scope.locationId, mailboxBlocklistEntry.locationId),
          eq(mailboxBlocklistEntry.matchType, input.matchType),
          eq(mailboxBlocklistEntry.valueNormalized, valueNormalized),
          isNull(mailboxBlocklistEntry.revokedAt),
          lt(mailboxBlocklistEntry.expiresAt, now),
        ),
      );
    return tx
      .insert(mailboxBlocklistEntry)
      .values({
        id: createId(),
        ...input.scope,
        matchType: input.matchType,
        valueNormalized,
        reason: input.reason,
        expiresAt: input.expiresAt,
        createdById: input.actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();
  });
  if (!entry) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This address or domain is already actively blocked.",
    });
  }
  return entry;
}

export async function revokeMailboxBlocklistEntry(input: {
  scope: CommunicationControlScope;
  actorUserId: string;
  id: string;
}) {
  const now = new Date();
  const [entry] = await db
    .update(mailboxBlocklistEntry)
    .set({ revokedAt: now, revokedById: input.actorUserId, updatedAt: now })
    .where(
      and(
        eq(mailboxBlocklistEntry.id, input.id),
        eq(mailboxBlocklistEntry.organizationId, input.scope.organizationId),
        exactLocationCondition(input.scope.locationId, mailboxBlocklistEntry.locationId),
        isNull(mailboxBlocklistEntry.revokedAt),
      ),
    )
    .returning();
  if (!entry) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Active mailbox block not found." });
  }
  return entry;
}

export async function findActiveMailboxBlock(input: {
  organizationId: string;
  locationId: string | null;
  sender: string;
  at?: Date;
}) {
  const at = input.at ?? new Date();
  const domain = input.sender.split("@")[1] ?? "";
  const locationScope = input.locationId
    ? or(isNull(mailboxBlocklistEntry.locationId), eq(mailboxBlocklistEntry.locationId, input.locationId))
    : isNull(mailboxBlocklistEntry.locationId);
  const [entry] = await db
    .select({ id: mailboxBlocklistEntry.id, reason: mailboxBlocklistEntry.reason })
    .from(mailboxBlocklistEntry)
    .where(
      and(
        eq(mailboxBlocklistEntry.organizationId, input.organizationId),
        locationScope,
        activeCondition(mailboxBlocklistEntry.revokedAt, mailboxBlocklistEntry.expiresAt, at),
        or(
          and(eq(mailboxBlocklistEntry.matchType, "ADDRESS"), eq(mailboxBlocklistEntry.valueNormalized, input.sender)),
          and(eq(mailboxBlocklistEntry.matchType, "DOMAIN"), eq(mailboxBlocklistEntry.valueNormalized, domain)),
        ),
      ),
    )
    .limit(1);
  return entry ?? null;
}
