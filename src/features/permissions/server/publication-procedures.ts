import "server-only";

import type { Capability } from "@/features/permissions/capabilities";
import { requireCapability } from "@/features/permissions/server/authorization";
import { protectedProcedure } from "@/trpc/init";

function withPublicationCapability(capability: Capability) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    await requireCapability({
      actor: {
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      },
      capability,
      resource: ctx.orgId
        ? {
            organizationId: ctx.orgId,
            locationId: ctx.locationId,
          }
        : undefined,
    });

    return next({ ctx });
  });
}

export const publicationViewProcedure = withPublicationCapability(
  "publication.view",
);
export const publicationManageProcedure = withPublicationCapability(
  "publication.manage",
);
