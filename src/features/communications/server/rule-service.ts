import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import {
  and,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  communicationRule,
  communicationRuleVersion,
} from "@/db/schema";
import type {
  CommunicationRuleValues,
  CommunicationRuleVersionValues,
  CommunicationRuleSnapshot,
} from "@/features/communications/contracts";
import type { DeliveryPurpose } from "@/features/delivery/contracts";

export type CommunicationControlScope = {
  organizationId: string;
  locationId: string | null;
};

function exactLocationCondition(
  locationId: string | null,
  column: typeof communicationRule.locationId,
) {
  return locationId ? eq(column, locationId) : isNull(column);
}

function escapedPattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}

const currentVersionJoin = and(
  eq(communicationRuleVersion.ruleId, communicationRule.id),
  eq(
    communicationRuleVersion.organizationId,
    communicationRule.organizationId,
  ),
  sql`${communicationRuleVersion.locationId} IS NOT DISTINCT FROM ${communicationRule.locationId}`,
  eq(communicationRuleVersion.version, communicationRule.currentVersion),
);

const ruleProjection = {
  id: communicationRule.id,
  name: communicationRule.name,
  eventKey: communicationRule.eventKey,
  channel: communicationRule.channel,
  purpose: communicationRule.purpose,
  currentVersion: communicationRule.currentVersion,
  archivedAt: communicationRule.archivedAt,
  isEnabled: communicationRuleVersion.isEnabled,
  scheduleOffsetMinutes: communicationRuleVersion.scheduleOffsetMinutes,
  subject: communicationRuleVersion.subject,
  textBody: communicationRuleVersion.textBody,
  htmlBody: communicationRuleVersion.htmlBody,
  changeNote: communicationRuleVersion.changeNote,
  versionCreatedAt: communicationRuleVersion.createdAt,
  createdAt: communicationRule.createdAt,
  updatedAt: communicationRule.updatedAt,
};

export async function listCommunicationRules(input: {
  scope: CommunicationControlScope;
  query: string;
  includeInactive: boolean;
  limit: number;
}) {
  const search = input.query
    ? or(
        ilike(communicationRule.name, escapedPattern(input.query)),
        ilike(communicationRule.eventKey, escapedPattern(input.query)),
      )
    : undefined;
  return db
    .select(ruleProjection)
    .from(communicationRule)
    .leftJoin(communicationRuleVersion, currentVersionJoin)
    .where(
      and(
        eq(communicationRule.organizationId, input.scope.organizationId),
        exactLocationCondition(input.scope.locationId, communicationRule.locationId),
        input.includeInactive ? undefined : isNull(communicationRule.archivedAt),
        search,
      ),
    )
    .orderBy(desc(communicationRule.updatedAt), desc(communicationRule.id))
    .limit(input.limit);
}

function versionValues(values: CommunicationRuleValues, version: number) {
  return {
    version,
    isEnabled: values.isEnabled,
    scheduleOffsetMinutes: values.scheduleOffsetMinutes,
    subject: values.channel === "EMAIL" ? values.subject : null,
    textBody: values.textBody,
    htmlBody: values.channel === "EMAIL" ? values.htmlBody : null,
    changeNote: values.changeNote,
  };
}

export async function createCommunicationRule(input: {
  scope: CommunicationControlScope;
  actorUserId: string;
  values: CommunicationRuleValues;
}) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const ruleId = createId();
    const [rule] = await tx
      .insert(communicationRule)
      .values({
        id: ruleId,
        ...input.scope,
        name: input.values.name,
        eventKey: input.values.eventKey,
        channel: input.values.channel,
        purpose: input.values.purpose,
        currentVersion: 1,
        createdById: input.actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();
    if (!rule) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "An active rule already exists for this event and channel.",
      });
    }
    const [version] = await tx
      .insert(communicationRuleVersion)
      .values({
        id: createId(),
        ruleId,
        ...input.scope,
        ...versionValues(input.values, 1),
        createdById: input.actorUserId,
        createdAt: now,
      })
      .returning();
    if (!version) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create the first communication rule version.",
      });
    }
    return { rule, version };
  });
}

export async function versionCommunicationRule(input: {
  scope: CommunicationControlScope;
  actorUserId: string;
  ruleId: string;
  expectedVersion: number;
  values: CommunicationRuleVersionValues;
}) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [rule] = await tx
      .select()
      .from(communicationRule)
      .where(
        and(
          eq(communicationRule.id, input.ruleId),
          eq(communicationRule.organizationId, input.scope.organizationId),
          exactLocationCondition(input.scope.locationId, communicationRule.locationId),
          isNull(communicationRule.archivedAt),
        ),
      )
      .limit(1)
      .for("update");
    if (!rule) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Communication rule not found." });
    }
    if (rule.currentVersion !== input.expectedVersion) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This rule changed since it was opened. Refresh and try again.",
      });
    }
    if (rule.channel !== input.values.channel) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A rule channel cannot change after creation. Clone it instead.",
      });
    }
    const nextVersion = rule.currentVersion + 1;
    const [version] = await tx
      .insert(communicationRuleVersion)
      .values({
        id: createId(),
        ruleId: rule.id,
        ...input.scope,
        ...versionValues(
          { ...input.values, name: rule.name, eventKey: rule.eventKey },
          nextVersion,
        ),
        createdById: input.actorUserId,
        createdAt: now,
      })
      .returning();
    const [updatedRule] = await tx
      .update(communicationRule)
      .set({
        purpose: input.values.purpose,
        currentVersion: nextVersion,
        updatedAt: now,
      })
      .where(
        and(
          eq(communicationRule.id, rule.id),
          eq(communicationRule.currentVersion, input.expectedVersion),
        ),
      )
      .returning();
    if (!version || !updatedRule) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "The rule could not be versioned because it changed concurrently.",
      });
    }
    return { rule: updatedRule, version };
  });
}

export async function cloneCommunicationRule(input: {
  scope: CommunicationControlScope;
  actorUserId: string;
  ruleId: string;
  name: string;
  eventKey: string;
}) {
  const [source] = await db
    .select(ruleProjection)
    .from(communicationRule)
    .innerJoin(communicationRuleVersion, currentVersionJoin)
    .where(
      and(
        eq(communicationRule.id, input.ruleId),
        eq(communicationRule.organizationId, input.scope.organizationId),
        exactLocationCondition(input.scope.locationId, communicationRule.locationId),
        isNull(communicationRule.archivedAt),
      ),
    )
    .limit(1);
  if (!source || !source.isEnabled) {
    if (!source) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Communication rule not found." });
    }
  }
  const values: CommunicationRuleValues =
    source.channel === "EMAIL"
      ? {
          name: input.name,
          eventKey: input.eventKey,
          channel: "EMAIL",
          purpose: source.purpose,
          isEnabled: source.isEnabled ?? false,
          scheduleOffsetMinutes: source.scheduleOffsetMinutes ?? 0,
          subject: source.subject ?? "Message",
          textBody: source.textBody,
          htmlBody: source.htmlBody,
          changeNote: `Cloned from ${source.name}`,
        }
      : {
          name: input.name,
          eventKey: input.eventKey,
          channel: "SMS",
          purpose: source.purpose,
          isEnabled: source.isEnabled ?? false,
          scheduleOffsetMinutes: source.scheduleOffsetMinutes ?? 0,
          subject: null,
          textBody: source.textBody ?? "Message",
          htmlBody: null,
          changeNote: `Cloned from ${source.name}`,
        };
  return createCommunicationRule({
    scope: input.scope,
    actorUserId: input.actorUserId,
    values,
  });
}

export async function archiveCommunicationRule(input: {
  scope: CommunicationControlScope;
  actorUserId: string;
  ruleId: string;
}) {
  const [rule] = await db
    .update(communicationRule)
    .set({
      archivedAt: new Date(),
      archivedById: input.actorUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(communicationRule.id, input.ruleId),
        eq(communicationRule.organizationId, input.scope.organizationId),
        exactLocationCondition(input.scope.locationId, communicationRule.locationId),
        isNull(communicationRule.archivedAt),
      ),
    )
    .returning();
  if (!rule) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Communication rule not found." });
  }
  return rule;
}

export async function resolveCommunicationRule(input: {
  organizationId: string;
  locationId: string | null;
  eventKey: string;
  channel: "EMAIL" | "SMS";
  at?: Date;
  includeDisabled?: boolean;
}) {
  const locationScope = input.locationId
    ? or(isNull(communicationRule.locationId), eq(communicationRule.locationId, input.locationId))
    : isNull(communicationRule.locationId);
  const [rule] = await db
    .select({
      ...ruleProjection,
      versionId: communicationRuleVersion.id,
      locationId: communicationRule.locationId,
    })
    .from(communicationRule)
    .innerJoin(communicationRuleVersion, currentVersionJoin)
    .where(
      and(
        eq(communicationRule.organizationId, input.organizationId),
        locationScope,
        eq(communicationRule.eventKey, input.eventKey),
        eq(communicationRule.channel, input.channel),
        isNull(communicationRule.archivedAt),
        input.includeDisabled
          ? undefined
          : eq(communicationRuleVersion.isEnabled, true),
      ),
    )
    .orderBy(desc(sql`CASE WHEN ${communicationRule.locationId} IS NULL THEN 0 ELSE 1 END`))
    .limit(1);
  if (!rule) return null;
  const scheduledFor = new Date(
    (input.at ?? new Date()).getTime() + (rule.scheduleOffsetMinutes ?? 0) * 60_000,
  );
  return {
    ...rule,
    channel: input.channel,
    scheduledFor,
    immutableSnapshot: {
      ruleId: rule.id,
      versionId: rule.versionId,
      version: rule.currentVersion,
      eventKey: rule.eventKey,
      channel: input.channel,
      purpose: rule.purpose,
      scheduleOffsetMinutes: rule.scheduleOffsetMinutes ?? 0,
    } satisfies CommunicationRuleSnapshot,
  };
}

export type ResolvedCommunicationRule = NonNullable<
  Awaited<ReturnType<typeof resolveCommunicationRule>>
>;

export type RulePurpose = DeliveryPurpose;
