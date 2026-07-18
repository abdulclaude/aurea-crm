import "server-only";

import { TRPCError } from "@trpc/server";
import {
  and,
  eq,
  inArray,
  isNull,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  anonymousUserProfiles,
  funnel,
  funnelEvent,
  funnelSession,
} from "@/db/schema";
import type { VisitorPrivacyInput } from "@/features/external-funnels/lib/visitor-privacy-contract";

const MAX_MATCHED_PROFILES = 100;

export const MAX_VISITOR_EXPORT_ROWS = 1_000;

export type VisitorScope = {
  organizationId: string;
  locationId: string | null;
};

type VisitorProfile = typeof anonymousUserProfiles.$inferSelect;

export type VisitorSubject = {
  anonymousIds: string[];
  identifiedUserIds: string[];
  profileIds: string[];
};

export function locationPredicate(
  locationId: string | null,
  column: AnyColumn,
): SQL {
  return locationId ? sql`${column} = ${locationId}` : sql`${column} is null`;
}

export function profileSubjectPredicate(input: VisitorSubject): SQL {
  const base = or(
    inArray(funnelSession.profileId, input.profileIds),
    inArray(funnelSession.anonymousId, input.anonymousIds),
  );
  const predicate =
    input.identifiedUserIds.length > 0
      ? or(base, inArray(funnelSession.userId, input.identifiedUserIds))
      : base;
  if (!predicate) throw new Error("Visitor subject predicate was empty.");
  return predicate;
}

export function eventSubjectPredicate(input: VisitorSubject): SQL {
  const predicate =
    input.identifiedUserIds.length > 0
      ? or(
          inArray(funnelEvent.anonymousId, input.anonymousIds),
          inArray(funnelEvent.userId, input.identifiedUserIds),
        )
      : inArray(funnelEvent.anonymousId, input.anonymousIds);
  if (!predicate) throw new Error("Visitor event predicate was empty.");
  return predicate;
}

export async function resolveVisitorProfiles(
  scope: VisitorScope,
  input: VisitorPrivacyInput,
): Promise<{ profiles: VisitorProfile[]; selectedFunnelName: string }> {
  const [selectedFunnel] = await db
    .select({ id: funnel.id, name: funnel.name })
    .from(funnel)
    .where(
      and(
        eq(funnel.id, input.funnelId),
        eq(funnel.organizationId, scope.organizationId),
        locationPredicate(scope.locationId, funnel.locationId),
      ),
    )
    .limit(1);
  if (!selectedFunnel) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Funnel not found" });
  }

  const identity = input.anonymousId
    ? or(
        eq(anonymousUserProfiles.id, input.anonymousId),
        eq(anonymousUserProfiles.anonymousId, input.anonymousId),
      )
    : sql<boolean>`lower(${anonymousUserProfiles.identifiedUserId}) = ${input.email?.toLowerCase() ?? ""}`;
  const profiles = await db
    .select()
    .from(anonymousUserProfiles)
    .where(
      and(
        eq(anonymousUserProfiles.organizationId, scope.organizationId),
        locationPredicate(scope.locationId, anonymousUserProfiles.locationId),
        isNull(anonymousUserProfiles.deletionRequestedAt),
        identity,
      ),
    )
    .limit(MAX_MATCHED_PROFILES + 1);
  if (profiles.length === 0 || profiles.length > MAX_MATCHED_PROFILES) {
    throw new TRPCError({
      code: profiles.length === 0 ? "NOT_FOUND" : "PRECONDITION_FAILED",
      message:
        profiles.length === 0
          ? "Visitor profile not found"
          : "Too many profiles matched this identifier.",
    });
  }

  const subject = visitorSubject(profiles);
  const [linkedSession] = await db
    .select({ id: funnelSession.id })
    .from(funnelSession)
    .where(
      and(
        eq(funnelSession.funnelId, selectedFunnel.id),
        locationPredicate(scope.locationId, funnelSession.locationId),
        or(
          inArray(funnelSession.profileId, subject.profileIds),
          inArray(funnelSession.anonymousId, subject.anonymousIds),
        ),
      ),
    )
    .limit(1);
  if (!linkedSession) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Visitor profile not found for this funnel",
    });
  }

  return { profiles, selectedFunnelName: selectedFunnel.name };
}

export function visitorSubject(profiles: VisitorProfile[]): VisitorSubject {
  return {
    profileIds: profiles.map((profile) => profile.id),
    anonymousIds: profiles.map((profile) => profile.anonymousId),
    identifiedUserIds: profiles.flatMap((profile) =>
      profile.identifiedUserId ? [profile.identifiedUserId] : [],
    ),
  };
}

export function scopeFunnelExists(
  scope: VisitorScope,
  funnelIdColumn: AnyColumn,
) {
  return sql<boolean>`exists (
    select 1 from "Funnel" scoped_funnel
    where scoped_funnel."id" = ${funnelIdColumn}
      and scoped_funnel."organizationId" = ${scope.organizationId}
      and scoped_funnel."locationId" is not distinct from ${scope.locationId}
  )`;
}
