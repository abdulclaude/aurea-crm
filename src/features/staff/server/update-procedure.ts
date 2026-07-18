import { TRPCError } from "@trpc/server";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { ActivityAction, ActivityType } from "@/db/enums";
import { staffIdentity, studioStaffMember } from "@/db/schema";
import {
  isStaffRoleValue,
  STAFF_TYPE_VALUES,
  type StaffTypeValue,
} from "@/features/staff/constants";
import { authorizeStaffAccess } from "@/features/staff/server/authorization";
import { getStaffProfileCapabilities } from "@/features/staff/server/capabilities";
import {
  buildStaffMetadata,
  readStaffProfilePhoto,
} from "@/features/staff/server/query-utils";
import { staffMutationSchema } from "@/features/staff/server/schemas";
import { logAnalytics } from "@/lib/analytics-logger";
import { protectedProcedure } from "@/trpc/init";

function isStaffTypeValue(value: string): value is StaffTypeValue {
  return STAFF_TYPE_VALUES.some((staffType) => staffType === value);
}

export const updateStaffProcedure = protectedProcedure
  .input(
    staffMutationSchema.partial().extend({
      id: z.string(),
      isActive: z.boolean().optional(),
    }),
  )
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

    const nextRole =
      input.role ??
      (existing.role && isStaffRoleValue(existing.role)
        ? existing.role
        : "INSTRUCTOR");
    const nextStaffType =
      input.staffType ??
      (existing.staffType && isStaffTypeValue(existing.staffType)
        ? existing.staffType
        : "INSTRUCTOR");
    const updated = await db.transaction(async (tx) => {
      const now = new Date();
      const [staff] = await tx
        .update(studioStaffMember)
        .set({
          name: input.name,
          email: input.email === undefined ? undefined : input.email || null,
          phone: input.phone === undefined ? undefined : input.phone || null,
          employeeId:
            input.employeeId === undefined
              ? undefined
              : input.employeeId || null,
          role: input.role,
          staffType: input.staffType,
          isActive: input.isActive,
          hourlyRate:
            input.hourlyRate === undefined
              ? undefined
              : String(input.hourlyRate),
          currency: input.currency,
          metadata:
            input.profilePhoto === undefined
              ? undefined
              : buildStaffMetadata(existing.metadata, input.profilePhoto),
          ...getStaffProfileCapabilities(nextStaffType, nextRole),
          updatedAt: now,
        })
        .where(eq(studioStaffMember.id, input.id))
        .returning();
      if (staff && existing.staffIdentityId) {
        await tx
          .update(staffIdentity)
          .set({
            displayName: input.name,
            email: input.email === undefined ? undefined : input.email || null,
            normalizedEmail:
              input.email === undefined
                ? undefined
                : input.email.trim().toLowerCase() || null,
            phone: input.phone === undefined ? undefined : input.phone || null,
            updatedById: ctx.auth.user.id,
            updatedAt: now,
          })
          .where(
            and(
              eq(staffIdentity.id, existing.staffIdentityId),
              eq(staffIdentity.organizationId, organizationId),
            ),
          );
      }
      return staff;
    });
    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update staff member.",
      });
    }

    await logAnalytics({
      organizationId,
      locationId: ctx.locationId,
      userId: ctx.auth.user.id,
      action: ActivityAction.UPDATED,
      type: ActivityType.INSTRUCTOR,
      entityType: "staff",
      entityId: updated.id,
      entityName: updated.name,
      metadata: { role: updated.role, staffType: updated.staffType },
    });
    return {
      ...updated,
      profilePhoto: readStaffProfilePhoto(updated.metadata),
    };
  });
