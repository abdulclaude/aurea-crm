import "server-only";

import { TRPCError } from "@trpc/server";

import { requireCapability } from "@/features/permissions/server/authorization";

export type StaffSettingsScope = {
  organizationId: string;
  locationId: string | null;
};

type StaffSettingsContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export async function requireStaffSettingsAccess(
  ctx: StaffSettingsContext,
  capability:
    | "team.view"
    | "team.manage"
    | "compensation.view"
    | "compensation.manage",
): Promise<StaffSettingsScope> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing staff settings.",
    });
  }
  const scope = { organizationId: ctx.orgId, locationId: ctx.locationId };
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability,
    resource: scope,
  });
  return scope;
}
