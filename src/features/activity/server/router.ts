import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@/db";
import { activity, user as userTable } from "@/db/schema";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { ActivityType, ActivityAction } from "@/db/enums";
import {
  and,
  count,
  desc,
  eq,
  gte,
  isNull,
  lt,
  lte,
  or,
  type SQL,
} from "drizzle-orm";

const ACTIVITY_PAGE_SIZE = 50;

const locationCondition = (locationId: string | null): SQL =>
  locationId ? eq(activity.locationId, locationId) : isNull(activity.locationId);

const scopedActivityConditions = ({
  organizationId,
  locationId,
}: {
  organizationId: string;
  locationId: string | null;
}): SQL[] => [
  eq(activity.organizationId, organizationId),
  locationCondition(locationId),
];

const activityWithUserSelect = {
  activity,
  user: {
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    image: userTable.image,
  },
};

const mapActivityRows = (
  rows: Array<{
    activity: typeof activity.$inferSelect;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
  }>
) => rows.map((row) => ({ ...row.activity, user: row.user }));

export const activityRouter = createTRPCRouter({
  // List activities with pagination and filters
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(ACTIVITY_PAGE_SIZE),
        cursor: z.string().optional(),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        type: z.nativeEnum(ActivityType).optional(),
        action: z.nativeEnum(ActivityAction).optional(),
        userId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const conditions = scopedActivityConditions({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
      });

      if (input.entityType) {
        conditions.push(eq(activity.entityType, input.entityType));
      }

      if (input.entityId) {
        conditions.push(eq(activity.entityId, input.entityId));
      }

      if (input.type) {
        conditions.push(eq(activity.type, input.type));
      }

      if (input.action) {
        conditions.push(eq(activity.action, input.action));
      }

      if (input.userId) {
        conditions.push(eq(activity.userId, input.userId));
      }

      if (input.startDate) {
        conditions.push(gte(activity.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(activity.createdAt, input.endDate));
      }

      if (input.cursor) {
        const [cursorActivity] = await db
          .select({ id: activity.id, createdAt: activity.createdAt })
          .from(activity)
          .where(
            and(
              eq(activity.id, input.cursor),
              eq(activity.organizationId, ctx.orgId)
            )
          )
          .limit(1);

        if (cursorActivity) {
          const cursorCondition = or(
            lt(activity.createdAt, cursorActivity.createdAt),
            and(
              eq(activity.createdAt, cursorActivity.createdAt),
              lt(activity.id, cursorActivity.id)
            )
          );

          if (cursorCondition) {
            conditions.push(cursorCondition);
          }
        }
      }

      const activities = mapActivityRows(
        await db
          .select(activityWithUserSelect)
          .from(activity)
          .innerJoin(userTable, eq(activity.userId, userTable.id))
          .where(and(...conditions))
          .orderBy(desc(activity.createdAt), desc(activity.id))
          .limit(input.limit + 1)
      );

      let nextCursor: string | undefined;
      if (activities.length > input.limit) {
        const nextItem = activities.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: activities,
        nextCursor,
      };
    }),

  // Get activities for a specific entity
  getByEntity: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const activities = mapActivityRows(
        await db
          .select(activityWithUserSelect)
          .from(activity)
          .innerJoin(userTable, eq(activity.userId, userTable.id))
          .where(
            and(
              ...scopedActivityConditions({
                organizationId: ctx.orgId,
                locationId: ctx.locationId ?? null,
              }),
              eq(activity.entityType, input.entityType),
              eq(activity.entityId, input.entityId)
            )
          )
          .orderBy(desc(activity.createdAt), desc(activity.id))
          .limit(input.limit)
      );

      return activities;
    }),

  // Get activity statistics
  getStats: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const conditions = scopedActivityConditions({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
      });

      if (input.startDate) {
        conditions.push(gte(activity.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(activity.createdAt, input.endDate));
      }
      const where = and(...conditions);

      const [byType, byAction, topUsers] = await Promise.all([
        db
          .select({
            type: activity.type,
            count: count(),
          })
          .from(activity)
          .where(where)
          .groupBy(activity.type),
        db
          .select({
            action: activity.action,
            count: count(),
          })
          .from(activity)
          .where(where)
          .groupBy(activity.action),
        db
          .select({
            user: {
              id: userTable.id,
              name: userTable.name,
              email: userTable.email,
              image: userTable.image,
            },
            count: count(activity.userId),
          })
          .from(activity)
          .innerJoin(userTable, eq(activity.userId, userTable.id))
          .where(where)
          .groupBy(
            activity.userId,
            userTable.id,
            userTable.name,
            userTable.email,
            userTable.image
          )
          .orderBy(desc(count(activity.userId)))
          .limit(10),
      ]);

      return {
        byType,
        byAction,
        topUsers,
      };
    }),

  // Create activity (manual logging)
  create: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(ActivityType),
        action: z.nativeEnum(ActivityAction),
        entityType: z.string(),
        entityId: z.string(),
        entityName: z.string(),
        changes: z.record(z.string(), z.unknown()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const [createdActivity] = await db
        .insert(activity)
        .values({
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          userId: ctx.auth.user.id,
          type: input.type,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          entityName: input.entityName,
          changes: input.changes,
          metadata: input.metadata,
          createdAt: new Date(),
        })
        .returning();

      const [row] = await db
        .select(activityWithUserSelect)
        .from(activity)
        .innerJoin(userTable, eq(activity.userId, userTable.id))
        .where(eq(activity.id, createdActivity.id))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to load created activity",
        });
      }

      return mapActivityRows([row])[0];
    }),

  // Delete activity (admin only)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const [deletedActivity] = await db
        .delete(activity)
        .where(
          and(
            eq(activity.id, input.id),
            ...scopedActivityConditions({
              organizationId: ctx.orgId,
              locationId: ctx.locationId ?? null,
            })
          )
        )
        .returning({ id: activity.id });

      if (!deletedActivity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Activity not found",
        });
      }

      return { success: true };
    }),
});
