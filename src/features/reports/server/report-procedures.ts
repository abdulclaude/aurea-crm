import "server-only";

import { requireCapability } from "@/features/permissions/server/authorization";
import type { Capability } from "@/features/permissions/capabilities";
import { protectedProcedure } from "@/trpc/init";

function withReportCapability(capability: Capability) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    await requireCapability({
      actor: {
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      },
      capability,
      resource: ctx.orgId
        ? { organizationId: ctx.orgId, locationId: ctx.locationId }
        : undefined,
    });
    return next({ ctx });
  });
}

export const reportViewProcedure = withReportCapability("reports.view");
export const reportManageProcedure = withReportCapability("reports.manage");
export const reportExportProcedure = withReportCapability("reports.export");
