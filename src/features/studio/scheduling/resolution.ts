import type {
  BookingWindowValues,
  WaitlistValues,
} from "@/features/studio/scheduling/contracts";

export type SchedulingPolicySource =
  | "CLASS_OVERRIDE"
  | "SERVICE_TYPE"
  | "LOCATION_DEFAULT"
  | "ORGANIZATION_DEFAULT"
  | "LEGACY";

export type VersionedSchedulingPolicy<TValues> = {
  policyId: string;
  versionId: string;
  version: number;
  effectiveFrom: Date;
  values: TValues;
};

export type ResolvedSchedulingPolicy<TValues> = {
  source: SchedulingPolicySource;
  policyId: string | null;
  versionId: string | null;
  version: number | null;
  effectiveFrom: Date | null;
  values: TValues;
};

type SchedulingPolicyResolutionInput<TValues> = {
  classOverride?: VersionedSchedulingPolicy<TValues> | null;
  serviceAssignment?: VersionedSchedulingPolicy<TValues> | null;
  locationDefault?: VersionedSchedulingPolicy<TValues> | null;
  organizationDefault?: VersionedSchedulingPolicy<TValues> | null;
  legacy: TValues;
};

function resolveSchedulingPolicy<TValues>(
  input: SchedulingPolicyResolutionInput<TValues>,
): ResolvedSchedulingPolicy<TValues> {
  if (input.classOverride) {
    return {
      source: "CLASS_OVERRIDE",
      policyId: input.classOverride.policyId,
      versionId: input.classOverride.versionId,
      version: input.classOverride.version,
      effectiveFrom: input.classOverride.effectiveFrom,
      values: input.classOverride.values,
    };
  }

  const candidates = [
    ["SERVICE_TYPE", input.serviceAssignment],
    ["LOCATION_DEFAULT", input.locationDefault],
    ["ORGANIZATION_DEFAULT", input.organizationDefault],
  ] as const;
  for (const [source, candidate] of candidates) {
    if (!candidate) continue;
    return {
      source,
      policyId: candidate.policyId,
      versionId: candidate.versionId,
      version: candidate.version,
      effectiveFrom: candidate.effectiveFrom,
      values: candidate.values,
    };
  }

  return {
    source: "LEGACY",
    policyId: null,
    versionId: null,
    version: null,
    effectiveFrom: null,
    values: input.legacy,
  };
}

export function resolveBookingWindowPolicy(
  input: SchedulingPolicyResolutionInput<BookingWindowValues>,
): ResolvedSchedulingPolicy<BookingWindowValues> {
  return resolveSchedulingPolicy(input);
}

export function resolveWaitlistPolicy(
  input: SchedulingPolicyResolutionInput<WaitlistValues>,
): ResolvedSchedulingPolicy<WaitlistValues> {
  return resolveSchedulingPolicy(input);
}
