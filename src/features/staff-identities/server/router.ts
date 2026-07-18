import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { ActivityAction, ActivityType } from "@/db/enums";
import { db } from "@/db";
import { staffIdentity } from "@/db/schema";
import {
  linkStaffIdentitySourceSchema,
  staffIdentityDirectorySchema,
} from "@/features/staff-identities/contracts";
import { getStaffIdentityDirectory } from "@/features/staff-identities/server/directory-service";
import { linkStaffIdentitySource } from "@/features/staff-identities/server/link-service";
import { staffIdentityVisibilityCondition } from "@/features/staff-identities/server/scope";
import { requireCapability } from "@/features/permissions/server/authorization";
import { logAnalytics } from "@/lib/analytics-logger";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const manageableStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

async function authorizeStaffIdentityAccess(input: {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
  capability: "team.view" | "team.manage";
}): Promise<string> {
  if (!input.organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing staff identities.",
    });
  }

  await requireCapability({
    actor: {
      userId: input.userId,
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
    capability: input.capability,
    resource: {
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
  });
  return input.organizationId;
}

export const staffIdentitiesRouter = createTRPCRouter({
  directory: protectedProcedure
    .output(staffIdentityDirectorySchema)
    .query(async ({ ctx }) => {
      const organizationId = await authorizeStaffIdentityAccess({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "team.view",
      });
      return getStaffIdentityDirectory({
        organizationId,
        locationId: ctx.locationId,
      });
    }),

  linkSource: protectedProcedure
    .input(linkStaffIdentitySourceSchema)
    .output(z.object({ identityId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeStaffIdentityAccess({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "team.manage",
      });
      const result = await linkStaffIdentitySource({
        scope: { organizationId, locationId: ctx.locationId },
        actorId: ctx.auth.user.id,
        ...input,
      });
      await logAnalytics({
        organizationId,
        locationId: ctx.locationId,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        type: ActivityType.ORGANIZATION,
        entityType: "staff_identity",
        entityId: result.identityId,
        entityName: "Staff identity",
        metadata: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          createdIdentity: input.identityId === null,
        },
      });
      return result;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1).max(128),
        status: manageableStatusSchema,
      }),
    )
    .output(z.object({ id: z.string(), status: manageableStatusSchema }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeStaffIdentityAccess({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "team.manage",
      });
      const scope = { organizationId, locationId: ctx.locationId };
      const [existing] = await db
        .select({
          id: staffIdentity.id,
          displayName: staffIdentity.displayName,
          userId: staffIdentity.userId,
          status: staffIdentity.status,
        })
        .from(staffIdentity)
        .where(
          and(
            eq(staffIdentity.id, input.id),
            eq(staffIdentity.organizationId, organizationId),
            ne(staffIdentity.status, "ARCHIVED"),
            staffIdentityVisibilityCondition(scope),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff identity not found.",
        });
      }
      if (
        existing.userId === ctx.auth.user.id &&
        input.status === "SUSPENDED"
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "You cannot suspend your own staff identity.",
        });
      }

      const [updated] = await db
        .update(staffIdentity)
        .set({
          status: input.status,
          updatedById: ctx.auth.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(staffIdentity.id, existing.id),
            eq(staffIdentity.organizationId, organizationId),
            eq(staffIdentity.status, existing.status),
          ),
        )
        .returning({ id: staffIdentity.id, status: staffIdentity.status });
      if (!updated) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This identity changed. Refresh and try again.",
        });
      }

      await logAnalytics({
        organizationId,
        locationId: ctx.locationId,
        userId: ctx.auth.user.id,
        action: ActivityAction.STATUS_CHANGED,
        type: ActivityType.ORGANIZATION,
        entityType: "staff_identity",
        entityId: updated.id,
        entityName: existing.displayName,
        changes: {
          status: { old: existing.status, new: updated.status },
        },
      });
      return { id: updated.id, status: input.status };
    }),
});
