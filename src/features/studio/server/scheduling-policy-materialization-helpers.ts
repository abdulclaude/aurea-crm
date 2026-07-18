import "server-only";

import { TRPCError } from "@trpc/server";

import type {
  BookingWindowValues,
  WaitlistValues,
} from "@/features/studio/scheduling/contracts";
import type { VersionedSchedulingPolicy } from "@/features/studio/scheduling/resolution";

export type LegacySchedulingValues = {
  bookingWindowHours?: number | null;
  cancellationWindowHours?: number | null;
  waitlistEnabled?: boolean | null;
  autoPromoteWaitlist?: boolean | null;
};

type Definition = {
  id: string;
  locationId: string | null;
  isDefault: boolean;
};

type PolicyVersion<TValues> = {
  id: string;
  policyId: string;
  version: number;
  effectiveFrom: Date;
  values: TValues;
};

export function schedulingCandidatesAt<TValues>(input: {
  definitions: Definition[];
  versions: PolicyVersion<TValues>[];
  startsAt: Date;
  locationId: string | null;
  overrideId: string | null;
  servicePolicyId: string | null;
}) {
  const withVersion = (id: string | null) => {
    if (!id) return null;
    const definition = input.definitions.find((policy) => policy.id === id);
    const version = input.versions.find(
      (candidate) =>
        candidate.policyId === id && candidate.effectiveFrom <= input.startsAt,
    );
    return definition && version
      ? { id: definition.id, currentVersion: version }
      : null;
  };
  const defaultAt = (locationId: string | null) => {
    const definition = input.definitions.find(
      (policy) => policy.locationId === locationId && policy.isDefault,
    );
    return withVersion(definition?.id ?? null);
  };
  return {
    override: withVersion(input.overrideId),
    service: withVersion(input.servicePolicyId),
    locationDefault: input.locationId ? defaultAt(input.locationId) : null,
    organizationDefault: defaultAt(null),
  };
}

export function toVersionedSchedulingPolicy<TValues>(
  policy: { id: string; currentVersion: PolicyVersion<TValues> } | null,
): VersionedSchedulingPolicy<TValues> | null {
  if (!policy) return null;
  return {
    policyId: policy.id,
    versionId: policy.currentVersion.id,
    version: policy.currentVersion.version,
    effectiveFrom: policy.currentVersion.effectiveFrom,
    values: policy.currentVersion.values,
  };
}

export function requireExplicitSchedulingCandidate(
  candidate: unknown,
  requestedId: string | null | undefined,
  label: string,
) {
  if (requestedId && !candidate) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `The selected ${label} is inactive, out of scope, or not effective for this class.`,
    });
  }
}

export function legacyBookingValues(
  legacy: LegacySchedulingValues,
): BookingWindowValues {
  return {
    opensMinutesBeforeStart: (legacy.bookingWindowHours ?? 168) * 60,
    closesMinutesBeforeStart: 0,
    cancellationsCloseMinutesBeforeStart:
      (legacy.cancellationWindowHours ?? 12) * 60,
    blockClientCancellations: false,
  };
}

export function legacyWaitlistValues(
  legacy: LegacySchedulingValues,
): WaitlistValues {
  return {
    mode: !legacy.waitlistEnabled
      ? "DISABLED"
      : legacy.autoPromoteWaitlist
        ? "OFFER_NEXT"
        : "MANUAL",
    automationClosesMinutesBeforeStart: 0,
    maxEntries: null,
    allowOverlappingReservations: true,
    creditHoldPolicy: "NONE",
    offerExpiryMinutes: legacy.autoPromoteWaitlist ? 15 : null,
    failureFallback: "MANUAL_REVIEW",
  };
}
