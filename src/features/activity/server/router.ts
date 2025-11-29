import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@/lib/db";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { ActivityType, ActivityAction } from "@prisma/client";

const ACTIVITY_PAGE_SIZE = 50;

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

      const where: any = {
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? null,
      };

      if (input.entityType) {
        where.entityType = input.entityType;
      }

      if (input.entityId) {
        where.entityId = input.entityId;
      }

      if (input.type) {
        where.type = input.type;
      }

      if (input.action) {
        where.action = input.action;
      }

      if (input.userId) {
        where.userId = input.userId;
      }

      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) {
          where.createdAt.gte = input.startDate;
        }
        if (input.endDate) {
          where.createdAt.lte = input.endDate;
        }
      }

      const activities = await prisma.activity.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

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

      const activities = await prisma.activity.findMany({
        where: {
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
          entityType: input.entityType,
          entityId: input.entityId,
        },
        take: input.limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

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

      const where: any = {
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? null,
      };

      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) {
          where.createdAt.gte = input.startDate;
        }
        if (input.endDate) {
          where.createdAt.lte = input.endDate;
        }
      }

      // Get activity counts by type
      const byType = await prisma.activity.groupBy({
        by: ["type"],
        where,
        _count: {
          _all: true,
        },
      });

      // Get activity counts by action
      const byAction = await prisma.activity.groupBy({
        by: ["action"],
        where,
        _count: {
          _all: true,
        },
      });

      // Get top users
      const byUser = await prisma.activity.groupBy({
        by: ["userId"],
        where,
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: "desc",
          },
        },
        take: 10,
      });

      // Get user details for top users
      const userIds = byUser.map((item) => item.userId);
      const users = await prisma.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      const topUsers = byUser.map((item) => ({
        user: users.find((u) => u.id === item.userId),
        count: item._count.userId || 0,
      }));

      return {
        byType: byType.map((item) => ({
          type: item.type,
          count: item._count._all,
        })),
        byAction: byAction.map((item) => ({
          action: item.action,
          count: item._count._all,
        })),
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
        changes: z.record(z.string(), z.any()).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const activity = await prisma.activity.create({
        data: {
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
          userId: ctx.auth.user.id,
          type: input.type,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          entityName: input.entityName,
          changes: input.changes as any,
          metadata: input.metadata as any,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return activity;
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

      const activity = await prisma.activity.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!activity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Activity not found",
        });
      }

      await prisma.activity.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
