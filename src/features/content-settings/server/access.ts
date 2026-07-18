import { TRPCError } from "@trpc/server";

import { requireCapability } from "@/features/permissions/server/authorization";

export type ContentSettingsScope = {
  organizationId: string;
  locationId: string | null;
};

type ContentSettingsContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export async function requireContentSettingsAccess(
  ctx: ContentSettingsContext,
  capability: "settings.view" | "settings.manage",
): Promise<ContentSettingsScope> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing reusable content.",
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
