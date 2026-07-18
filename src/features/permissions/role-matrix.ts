import { z } from "zod";

import type { LocationMemberRole, OrganizationMemberRole } from "@/db/enums";
import {
  CAPABILITY_VALUES,
  type Capability,
} from "@/features/permissions/capabilities";

export const ORGANIZATION_ROLE_VALUES = [
  "owner",
  "admin",
  "manager",
  "staff",
  "viewer",
] as const satisfies readonly OrganizationMemberRole[];

export const LOCATION_ROLE_VALUES = [
  "AGENCY",
  "ADMIN",
  "MANAGER",
  "STANDARD",
  "LIMITED",
  "VIEWER",
] as const satisfies readonly LocationMemberRole[];

export const organizationRoleSchema = z.enum(ORGANIZATION_ROLE_VALUES);
export const locationRoleSchema = z.enum(LOCATION_ROLE_VALUES);

export type OrganizationRole = z.infer<typeof organizationRoleSchema>;
export type LocationRole = z.infer<typeof locationRoleSchema>;

export function organizationRoleHasCapability(
  role: OrganizationRole | null,
  capability: Capability,
): boolean {
  if (!role) return false;
  const capabilities: readonly Capability[] =
    ORGANIZATION_ROLE_CAPABILITIES[role];
  return capabilities.includes(capability);
}

const READ_ONLY_CAPABILITIES = [
  "commerce.view",
  "messaging.view",
  "team.view",
  "audience.view",
  "publication.view",
  "reports.view",
  "workflow.view",
  "settings.view",
  "customer.view",
  "schedule.view",
] as const satisfies readonly Capability[];

const FULL_CAPABILITIES = [
  "commerce.view",
  "commerce.checkout.create",
  "commerce.manage",
  "commerce.refund",
  "commerce.reconcile",
  "provider.manage",
  "demo.manage",
  "messaging.view",
  "messaging.send",
  "messaging.assign",
  "messaging.manage",
  "voice.call",
  "voice.recording.view",
  "team.view",
  "team.manage",
  "compensation.view",
  "compensation.manage",
  "audience.view",
  "audience.manage",
  "publication.view",
  "publication.manage",
  "reports.view",
  "reports.manage",
  "reports.export",
  "privacy.export",
  "privacy.erase",
  "workflow.view",
  "workflow.manage",
  "settings.view",
  "settings.manage",
  "customer.view",
  "customer.manage",
  "schedule.view",
  "schedule.manage",
  "attendance.manage",
] as const satisfies readonly Capability[];

export const ORGANIZATION_ROLE_CAPABILITIES = {
  owner: FULL_CAPABILITIES,
  admin: [
    "commerce.view",
    "commerce.checkout.create",
    "commerce.refund",
    "provider.manage",
    "demo.manage",
    "messaging.view",
    "messaging.send",
    "messaging.assign",
    "messaging.manage",
    "voice.call",
    "voice.recording.view",
    "team.view",
    "team.manage",
    "compensation.view",
    "compensation.manage",
    "audience.view",
    "audience.manage",
    "publication.view",
    "publication.manage",
    "reports.view",
    "reports.manage",
    "reports.export",
    "privacy.export",
    "privacy.erase",
    "workflow.view",
    "workflow.manage",
    "settings.view",
    "settings.manage",
    "customer.view",
    "customer.manage",
    "schedule.view",
    "schedule.manage",
    "attendance.manage",
  ],
  manager: [
    ...READ_ONLY_CAPABILITIES,
    "commerce.checkout.create",
    "messaging.send",
    "messaging.assign",
    "voice.call",
    "audience.manage",
    "reports.manage",
    "reports.export",
    "privacy.export",
    "customer.manage",
    "schedule.manage",
    "attendance.manage",
  ],
  // Organization staff permissions are defined by their assigned location role.
  staff: [],
  viewer: READ_ONLY_CAPABILITIES,
} as const satisfies Record<OrganizationRole, readonly Capability[]>;

export const LOCATION_ROLE_CAPABILITIES = {
  AGENCY: FULL_CAPABILITIES,
  ADMIN: FULL_CAPABILITIES,
  MANAGER: [
    ...READ_ONLY_CAPABILITIES,
    "commerce.checkout.create",
    "messaging.send",
    "messaging.assign",
    "voice.call",
    "audience.manage",
    "reports.manage",
    "reports.export",
    "privacy.export",
    "customer.manage",
    "schedule.manage",
    "attendance.manage",
  ],
  STANDARD: [
    "commerce.checkout.create",
    "team.view",
    "customer.view",
    "schedule.view",
    "attendance.manage",
  ],
  LIMITED: [
    "messaging.view",
    "messaging.send",
    "voice.call",
    "customer.view",
    "schedule.view",
  ],
  VIEWER: READ_ONLY_CAPABILITIES,
} as const satisfies Record<LocationRole, readonly Capability[]>;

export function resolveRoleCapabilities(input: {
  organizationRole: OrganizationRole | null;
  locationRole: LocationRole | null;
}): Capability[] {
  const granted = new Set<Capability>();

  if (input.organizationRole) {
    for (const capability of ORGANIZATION_ROLE_CAPABILITIES[
      input.organizationRole
    ]) {
      granted.add(capability);
    }
  }

  if (input.locationRole) {
    for (const capability of LOCATION_ROLE_CAPABILITIES[input.locationRole]) {
      granted.add(capability);
    }
  }

  return CAPABILITY_VALUES.filter((capability) => granted.has(capability));
}
