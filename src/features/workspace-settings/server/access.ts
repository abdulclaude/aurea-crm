import { TRPCError } from "@trpc/server";

import type { Capability } from "@/features/permissions/capabilities";
import { requireCapability } from "@/features/permissions/server/authorization";

export type WorkspaceSettingsScope = {
  organizationId: string;
  locationId: string | null;
};

type WorkspaceSettingsContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export async function requireWorkspaceSettingsAccess(
  ctx: WorkspaceSettingsContext,
  capability: Extract<Capability, "settings.view" | "settings.manage">,
): Promise<WorkspaceSettingsScope> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing workspace settings.",
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

export async function requireWorkspaceOperationsRuntimeAccess(
  ctx: WorkspaceSettingsContext,
  capability: Extract<Capability, "schedule.view" | "schedule.manage">,
): Promise<WorkspaceSettingsScope> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before loading workspace operations.",
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
