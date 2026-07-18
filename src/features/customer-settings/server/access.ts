import { TRPCError } from "@trpc/server";
import { requireCapability } from "@/features/permissions/server/authorization";

export type CustomerSettingsScope = {
  organizationId: string;
  locationId: string | null;
};

type CustomerSettingsContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export async function requireCustomerSettingsAccess(
  ctx: CustomerSettingsContext,
  capability: "settings.view" | "settings.manage",
): Promise<CustomerSettingsScope> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing customer settings.",
    });
  }
  const scope = { organizationId: ctx.orgId, locationId: ctx.locationId };
  await requireCapability({
    actor: { userId: ctx.auth.user.id, ...scope },
    capability,
    resource: scope,
  });
  return scope;
}
