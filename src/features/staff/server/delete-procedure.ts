import { TRPCError } from "@trpc/server";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { ActivityAction, ActivityType } from "@/db/enums";
import { studioStaffMember } from "@/db/schema";
import { authorizeStaffAccess } from "@/features/staff/server/authorization";
import { logAnalytics } from "@/lib/analytics-logger";
import { protectedProcedure } from "@/trpc/init";

export const deleteStaffProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const organizationId = await authorizeStaffAccess({
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
      capability: "team.manage",
    });
    const scopeConditions: SQL[] = [
      eq(studioStaffMember.id, input.id),
      eq(studioStaffMember.organizationId, organizationId),
      isNull(studioStaffMember.deletedAt),
    ];
    if (ctx.locationId) {
      scopeConditions.push(eq(studioStaffMember.locationId, ctx.locationId));
    }
    const existing = await db.query.studioStaffMember.findFirst({
      where: and(...scopeConditions),
    });
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Staff member not found.",
      });
    }
    await db
      .update(studioStaffMember)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(studioStaffMember.id, existing.id));
    await logAnalytics({
      organizationId,
      locationId: ctx.locationId,
      userId: ctx.auth.user.id,
      action: ActivityAction.DELETED,
      type: ActivityType.INSTRUCTOR,
      entityType: "staff",
      entityId: existing.id,
      entityName: existing.name,
      metadata: { role: existing.role, staffType: existing.staffType },
    });
    return { success: true };
  });
