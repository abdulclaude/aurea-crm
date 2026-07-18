import "server-only";

import { requireCapability } from "@/features/permissions/server/authorization";
import { protectedProcedure } from "@/trpc/init";

export const workflowViewProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    await requireCapability({
      actor: {
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      },
      capability: "workflow.view",
      resource: ctx.orgId
        ? { organizationId: ctx.orgId, locationId: ctx.locationId }
        : undefined,
    });
    return next({ ctx });
  },
);
