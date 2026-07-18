import "server-only";

import { and, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";

import { db } from "@/db";
import {
  bookingWindowPolicy,
  bookingWindowPolicyVersion,
  serviceType,
  waitlistPolicy,
  waitlistPolicyVersion,
} from "@/db/schema";
import type { SchedulingPolicyKind } from "@/features/studio/scheduling/contracts";

import type { SchedulingPolicyScope } from "./scheduling-policy-access";
import {
  bookingVersionView,
  schedulingPolicyNotFound,
  waitlistVersionView,
  type BookingWindowPolicyVersionView,
  type SchedulingPolicyListView,
  type WaitlistPolicyVersionView,
} from "./scheduling-policy-model";

export async function listSchedulingPolicies(
  scope: SchedulingPolicyScope,
  at = new Date(),
): Promise<SchedulingPolicyListView> {
  const scopeFilter = scope.locationId
    ? or(
        isNull(bookingWindowPolicy.locationId),
        eq(bookingWindowPolicy.locationId, scope.locationId),
      )
    : isNull(bookingWindowPolicy.locationId);
  const waitlistScopeFilter = scope.locationId
    ? or(
        isNull(waitlistPolicy.locationId),
        eq(waitlistPolicy.locationId, scope.locationId),
      )
    : isNull(waitlistPolicy.locationId);
  const [bookingDefinitions, waitlistDefinitions, services] = await Promise.all(
    [
      db
        .select()
        .from(bookingWindowPolicy)
        .where(
          and(
            eq(bookingWindowPolicy.organizationId, scope.organizationId),
            scopeFilter,
          ),
        ),
      db
        .select()
        .from(waitlistPolicy)
        .where(
          and(
            eq(waitlistPolicy.organizationId, scope.organizationId),
            waitlistScopeFilter,
          ),
        ),
      db
        .select({
          id: serviceType.id,
          name: serviceType.name,
          isActive: serviceType.isActive,
          bookingWindowPolicyId: serviceType.bookingWindowPolicyId,
          waitlistPolicyId: serviceType.waitlistPolicyId,
        })
        .from(serviceType)
        .where(
          and(
            eq(serviceType.organizationId, scope.organizationId),
            scope.locationId
              ? eq(serviceType.locationId, scope.locationId)
              : isNull(serviceType.locationId),
          ),
        ),
    ],
  );
  const [bookingVersions, waitlistVersions] = await Promise.all([
    currentBookingVersions(
      bookingDefinitions.map((definition) => definition.id),
      at,
    ),
    currentWaitlistVersions(
      waitlistDefinitions.map((definition) => definition.id),
      at,
    ),
  ]);
  return {
    scope,
    bookingWindows: bookingDefinitions.map((definition) => ({
      ...definition,
      kind: "BOOKING_WINDOW" as const,
      currentVersion: bookingVersions.get(definition.id) ?? null,
    })),
    waitlists: waitlistDefinitions.map((definition) => ({
      ...definition,
      kind: "WAITLIST" as const,
      currentVersion: waitlistVersions.get(definition.id) ?? null,
    })),
    services,
  };
}

export async function listSchedulingPolicyHistory(
  scope: SchedulingPolicyScope,
  kind: SchedulingPolicyKind,
  policyId: string,
): Promise<Array<BookingWindowPolicyVersionView | WaitlistPolicyVersionView>> {
  await requireScopedPolicy(scope, kind, policyId, false);
  if (kind === "BOOKING_WINDOW") {
    const rows = await db
      .select()
      .from(bookingWindowPolicyVersion)
      .where(
        and(
          eq(bookingWindowPolicyVersion.organizationId, scope.organizationId),
          eq(bookingWindowPolicyVersion.policyId, policyId),
        ),
      )
      .orderBy(desc(bookingWindowPolicyVersion.version))
      .limit(50);
    return rows.map(bookingVersionView);
  }
  const rows = await db
    .select()
    .from(waitlistPolicyVersion)
    .where(
      and(
        eq(waitlistPolicyVersion.organizationId, scope.organizationId),
        eq(waitlistPolicyVersion.policyId, policyId),
      ),
    )
    .orderBy(desc(waitlistPolicyVersion.version))
    .limit(50);
  return rows.map(waitlistVersionView);
}

export async function requireScopedPolicy(
  scope: SchedulingPolicyScope,
  kind: SchedulingPolicyKind,
  policyId: string,
  requireActive: boolean,
) {
  const table =
    kind === "BOOKING_WINDOW" ? bookingWindowPolicy : waitlistPolicy;
  const [policy] = await db
    .select()
    .from(table)
    .where(
      and(
        eq(table.id, policyId),
        eq(table.organizationId, scope.organizationId),
        scope.locationId
          ? or(isNull(table.locationId), eq(table.locationId, scope.locationId))
          : isNull(table.locationId),
        requireActive ? eq(table.isActive, true) : undefined,
      ),
    )
    .limit(1);
  if (!policy) schedulingPolicyNotFound(kind);
  return policy;
}

async function currentBookingVersions(policyIds: string[], at: Date) {
  const result = new Map<string, BookingWindowPolicyVersionView>();
  if (policyIds.length === 0) return result;
  const rows = await db
    .select()
    .from(bookingWindowPolicyVersion)
    .where(
      and(
        inArray(bookingWindowPolicyVersion.policyId, policyIds),
        lte(bookingWindowPolicyVersion.effectiveFrom, at),
      ),
    )
    .orderBy(
      desc(bookingWindowPolicyVersion.effectiveFrom),
      desc(bookingWindowPolicyVersion.version),
    );
  for (const row of rows) {
    if (!result.has(row.policyId)) {
      result.set(row.policyId, bookingVersionView(row));
    }
  }
  return result;
}

async function currentWaitlistVersions(policyIds: string[], at: Date) {
  const result = new Map<string, WaitlistPolicyVersionView>();
  if (policyIds.length === 0) return result;
  const rows = await db
    .select()
    .from(waitlistPolicyVersion)
    .where(
      and(
        inArray(waitlistPolicyVersion.policyId, policyIds),
        lte(waitlistPolicyVersion.effectiveFrom, at),
      ),
    )
    .orderBy(
      desc(waitlistPolicyVersion.effectiveFrom),
      desc(waitlistPolicyVersion.version),
    );
  for (const row of rows) {
    if (!result.has(row.policyId)) {
      result.set(row.policyId, waitlistVersionView(row));
    }
  }
  return result;
}
