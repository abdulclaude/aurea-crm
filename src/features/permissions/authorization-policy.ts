import type { Capability } from "@/features/permissions/capabilities";
import type {
  LocationRole,
  OrganizationRole,
} from "@/features/permissions/role-matrix";

export type ActorCapabilitySnapshot = {
  organizationId: string | null;
  locationId: string | null;
  organizationRole: OrganizationRole | null;
  locationRole: LocationRole | null;
  capabilities: Capability[];
};

export type ResourceAuthorizationScope = {
  organizationId: string;
  locationId?: string | null;
};

export type CapabilityDenialReason =
  | "NO_ACTIVE_ORGANIZATION"
  | "TENANT_SCOPE_MISMATCH"
  | "LOCATION_SCOPE_MISMATCH"
  | "NO_MEMBERSHIP"
  | "CAPABILITY_NOT_GRANTED";

export type CapabilityDecision =
  | { allowed: true }
  | { allowed: false; reason: CapabilityDenialReason };

export function evaluateCapabilityAccess(input: {
  actor: ActorCapabilitySnapshot;
  capability: Capability;
  resource?: ResourceAuthorizationScope;
}): CapabilityDecision {
  if (!input.actor.organizationId) {
    return { allowed: false, reason: "NO_ACTIVE_ORGANIZATION" };
  }

  if (
    input.resource &&
    input.resource.organizationId !== input.actor.organizationId
  ) {
    return { allowed: false, reason: "TENANT_SCOPE_MISMATCH" };
  }

  // Organization-level context can cross locations; an active location is exact.
  if (
    input.actor.locationId &&
    input.resource?.locationId !== undefined &&
    input.resource.locationId !== input.actor.locationId
  ) {
    return { allowed: false, reason: "LOCATION_SCOPE_MISMATCH" };
  }

  if (!input.actor.organizationRole && !input.actor.locationRole) {
    return { allowed: false, reason: "NO_MEMBERSHIP" };
  }

  if (!input.actor.capabilities.includes(input.capability)) {
    return { allowed: false, reason: "CAPABILITY_NOT_GRANTED" };
  }

  return { allowed: true };
}
