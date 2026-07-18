import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { serviceType } from "@/db/schema";
import type {
  BookingWindowValues,
  WaitlistValues,
} from "@/features/studio/scheduling/contracts";
import {
  resolveBookingWindowPolicy,
  resolveWaitlistPolicy,
  type VersionedSchedulingPolicy,
} from "@/features/studio/scheduling/resolution";

import type { SchedulingPolicyScope } from "./scheduling-policy-access";
import { listSchedulingPolicies } from "./scheduling-policy-query-service";

const LEGACY_BOOKING_VALUES: BookingWindowValues = {
  opensMinutesBeforeStart: 168 * 60,
  closesMinutesBeforeStart: 0,
  cancellationsCloseMinutesBeforeStart: 12 * 60,
  blockClientCancellations: false,
};

const LEGACY_WAITLIST_VALUES: WaitlistValues = {
  mode: "DISABLED",
  automationClosesMinutesBeforeStart: 0,
  maxEntries: null,
  allowOverlappingReservations: true,
  creditHoldPolicy: "NONE",
  offerExpiryMinutes: null,
  failureFallback: "MANUAL_REVIEW",
};

export async function previewSchedulingPolicies(input: {
  scope: SchedulingPolicyScope;
  serviceTypeId: string | null;
  bookingWindowPolicyOverrideId: string | null;
  waitlistPolicyOverrideId: string | null;
  startsAt: Date;
}) {
  const service = input.serviceTypeId
    ? await findScopedService(input.scope, input.serviceTypeId)
    : null;
  const policies = await listSchedulingPolicies(input.scope, input.startsAt);
  const booking = policyCandidates(
    policies.bookingWindows,
    input.scope.locationId,
    input.bookingWindowPolicyOverrideId,
    service?.bookingWindowPolicyId ?? null,
  );
  const waitlist = policyCandidates(
    policies.waitlists,
    input.scope.locationId,
    input.waitlistPolicyOverrideId,
    service?.waitlistPolicyId ?? null,
  );
  return {
    service: service ? { id: service.id, name: service.name } : null,
    startsAt: input.startsAt,
    bookingWindow: resolveBookingWindowPolicy({
      classOverride: toVersioned(booking.override),
      serviceAssignment: toVersioned(booking.service),
      locationDefault: toVersioned(booking.locationDefault),
      organizationDefault: toVersioned(booking.organizationDefault),
      legacy: LEGACY_BOOKING_VALUES,
    }),
    waitlist: resolveWaitlistPolicy({
      classOverride: toVersioned(waitlist.override),
      serviceAssignment: toVersioned(waitlist.service),
      locationDefault: toVersioned(waitlist.locationDefault),
      organizationDefault: toVersioned(waitlist.organizationDefault),
      legacy: LEGACY_WAITLIST_VALUES,
    }),
  };
}

async function findScopedService(
  scope: SchedulingPolicyScope,
  serviceTypeId: string,
) {
  const [service] = await db
    .select({
      id: serviceType.id,
      name: serviceType.name,
      bookingWindowPolicyId: serviceType.bookingWindowPolicyId,
      waitlistPolicyId: serviceType.waitlistPolicyId,
    })
    .from(serviceType)
    .where(
      and(
        eq(serviceType.id, serviceTypeId),
        eq(serviceType.organizationId, scope.organizationId),
        scope.locationId
          ? eq(serviceType.locationId, scope.locationId)
          : isNull(serviceType.locationId),
      ),
    )
    .limit(1);
  if (!service) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Service type not found in the active settings scope.",
    });
  }
  return service;
}

type PolicyWithVersion<TVersion> = {
  id: string;
  locationId: string | null;
  isDefault: boolean;
  isActive: boolean;
  currentVersion: TVersion | null;
};

function policyCandidates<TVersion>(
  policies: Array<PolicyWithVersion<TVersion>>,
  locationId: string | null,
  overrideId: string | null,
  servicePolicyId: string | null,
) {
  const eligible = (id: string | null) =>
    id
      ? (policies.find(
          (policy) =>
            policy.id === id && policy.isActive && policy.currentVersion,
        ) ?? null)
      : null;
  return {
    override: eligible(overrideId),
    service: eligible(servicePolicyId),
    locationDefault: locationId
      ? (policies.find(
          (policy) =>
            policy.locationId === locationId &&
            policy.isActive &&
            policy.isDefault &&
            policy.currentVersion,
        ) ?? null)
      : null,
    organizationDefault:
      policies.find(
        (policy) =>
          policy.locationId === null &&
          policy.isActive &&
          policy.isDefault &&
          policy.currentVersion,
      ) ?? null,
  };
}

function toVersioned<
  TVersion extends {
    id: string;
    version: number;
    effectiveFrom: Date;
    values: unknown;
  },
>(
  policy: { id: string; currentVersion: TVersion | null } | null,
): VersionedSchedulingPolicy<TVersion["values"]> | null {
  if (!policy?.currentVersion) return null;
  return {
    policyId: policy.id,
    versionId: policy.currentVersion.id,
    version: policy.currentVersion.version,
    effectiveFrom: policy.currentVersion.effectiveFrom,
    values: policy.currentVersion.values,
  };
}
