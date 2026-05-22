import { TRPCError } from "@trpc/server";
import { and, count, eq, isNull, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  classType,
  instructor,
  membershipPlan,
  room,
  studioClass,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

function requireOrgId(orgId: string | null): string {
  if (!orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
  }

  return orgId;
}

function locationCondition(column: AnyPgColumn, locationId: string | null) {
  return locationId ? eq(column, locationId) : isNull(column);
}

export const launchpadRouter = createTRPCRouter({
  progress: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrgId(ctx.orgId);
    const locationId = ctx.locationId ?? null;

    const [rooms, classTypes, instructors, plans, classes] = await Promise.all([
      db
        .select({ total: count() })
        .from(room)
        .where(
          and(
            eq(room.organizationId, orgId),
            locationCondition(room.locationId, locationId),
          ),
        ),
      db
        .select({ total: count() })
        .from(classType)
        .where(
          and(
            eq(classType.organizationId, orgId),
            locationCondition(classType.locationId, locationId),
            eq(classType.isActive, true),
          ),
        ),
      db
        .select({ total: count() })
        .from(instructor)
        .where(
          and(
            eq(instructor.organizationId, orgId),
            locationCondition(instructor.locationId, locationId),
            eq(instructor.isActive, true),
            eq(instructor.isSystem, false),
            or(
              isNull(instructor.mindbodyTrainerId),
              sql`${instructor.customFields}->'raw'->>'Teacher' = 'True'`,
              sql`${instructor.customFields}->'raw'->>'AppointmentTrn' = 'True'`,
              sql`${instructor.customFields}->'raw'->>'ReservationTrn' = 'True'`,
              sql`${instructor.customFields}->'raw'->>'Workshop Instructor' = 'True'`,
            ),
          ),
        ),
      db
        .select({ total: count() })
        .from(membershipPlan)
        .where(
          and(
            eq(membershipPlan.organizationId, orgId),
            locationCondition(membershipPlan.locationId, locationId),
            eq(membershipPlan.isActive, true),
          ),
        ),
      db
        .select({ total: count() })
        .from(studioClass)
        .where(
          and(
            eq(studioClass.organizationId, orgId),
            locationId ? eq(studioClass.locationId, locationId) : undefined,
          ),
        ),
    ]);

    const progress = {
      hasStudioProfile: true,
      hasRooms: (rooms[0]?.total ?? 0) > 0,
      hasClassTypes: (classTypes[0]?.total ?? 0) > 0,
      hasInstructors: (instructors[0]?.total ?? 0) > 0,
      hasMembershipPlans: (plans[0]?.total ?? 0) > 0,
      hasClasses: (classes[0]?.total ?? 0) > 0,
    };

    const completed = Object.values(progress).filter(Boolean).length;

    return {
      ...progress,
      completed,
      total: Object.keys(progress).length,
      percentage: Math.round((completed / Object.keys(progress).length) * 100),
    };
  }),
});
