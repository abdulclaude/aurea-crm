import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { ActivityAction, ActivityType } from "@/db/enums";
import { staffIdentity, studioStaffMember } from "@/db/schema";
import { authorizeStaffAccess } from "@/features/staff/server/authorization";
import { getStaffProfileCapabilities } from "@/features/staff/server/capabilities";
import {
  buildStaffMetadata,
  readStaffProfilePhoto,
} from "@/features/staff/server/query-utils";
import { staffMutationSchema } from "@/features/staff/server/schemas";
import { logAnalytics } from "@/lib/analytics-logger";
import { protectedProcedure } from "@/trpc/init";

export const createStaffProcedure = protectedProcedure
  .input(staffMutationSchema)
  .mutation(async ({ ctx, input }) => {
    const organizationId = await authorizeStaffAccess({
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
      capability: "team.manage",
    });
    const capabilities = getStaffProfileCapabilities(
      input.staffType,
      input.role,
    );
    const created = await db.transaction(async (tx) => {
      const now = new Date();
      const identityId = createId();
      await tx.insert(staffIdentity).values({
        id: identityId,
        organizationId,
        displayName: input.name,
        email: input.email || null,
        normalizedEmail: input.email?.trim().toLowerCase() || null,
        phone: input.phone || null,
        status: "ACTIVE",
        createdById: ctx.auth.user.id,
        updatedById: ctx.auth.user.id,
        createdAt: now,
        updatedAt: now,
      });
      const [staff] = await tx
        .insert(studioStaffMember)
        .values({
          id: createId(),
          staffIdentityId: identityId,
          organizationId,
          locationId: ctx.locationId,
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          employeeId: input.employeeId || null,
          role: input.role,
          staffType: input.staffType,
          hourlyRate:
            input.hourlyRate === undefined ? null : String(input.hourlyRate),
          currency: input.currency,
          metadata: buildStaffMetadata(null, input.profilePhoto),
          ...capabilities,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return staff;
    });
    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create staff member.",
      });
    }

    await logAnalytics({
      organizationId,
      locationId: ctx.locationId,
      userId: ctx.auth.user.id,
      action: ActivityAction.CREATED,
      type: ActivityType.INSTRUCTOR,
      entityType: "staff",
      entityId: created.id,
      entityName: created.name,
      metadata: { role: created.role, staffType: created.staffType },
    });
    return {
      ...created,
      profilePhoto: readStaffProfilePhoto(created.metadata),
    };
  });
