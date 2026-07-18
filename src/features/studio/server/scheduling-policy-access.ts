import { TRPCError } from "@trpc/server";

import type { Capability } from "@/features/permissions/capabilities";
import { requireCapability } from "@/features/permissions/server/authorization";

export type SchedulingPolicyScope = {
  organizationId: string;
  locationId: string | null;
};

type SchedulingPolicyContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export async function requireSchedulingPolicyAccess(
  ctx: SchedulingPolicyContext,
  capability: Extract<
    Capability,
    "settings.view" | "settings.manage" | "schedule.view" | "schedule.manage"
  >,
): Promise<SchedulingPolicyScope> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing scheduling policies.",
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
