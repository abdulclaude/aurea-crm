import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { ActivityAction } from "@prisma/client";

/**
 * Analytics Router
 * Aggregates data from activity logs to provide analytics insights
 * This data mirrors what's sent to PostHog for consistent analytics
 */
export const analyticsRouter = createTRPCRouter({
  /**
   * Get workflow analytics
   */
  getWorkflowAnalytics: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        return {
          totalExecuted: 0,
          successCount: 0,
          failedCount: 0,
          avgDuration: 0,
          totalCreated: 0,
          totalUpdated: 0,
          totalArchived: 0,
        };
      }

      const dateFilter = input?.dateFrom || input?.dateTo ? {
        createdAt: {
          ...(input?.dateFrom && { gte: input.dateFrom }),
          ...(input?.dateTo && { lte: input.dateTo }),
        },
      } : {};

      const baseWhere = {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
        entityType: "workflow",
        ...dateFilter,
      };

      // Get execution stats from Execution table instead of Activity
      // (Workflow executions are tracked separately)
      const executionWhere = {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
        ...(input?.dateFrom && { createdAt: { gte: input.dateFrom } }),
      };

      const totalExecutions = await prisma.execution.count({
        where: executionWhere,
      });

      const successfulExecutions = await prisma.execution.count({
        where: {
          ...executionWhere,
          error: null, // No error means successful
        },
      });

      const failedExecutions = await prisma.execution.count({
        where: {
          ...executionWhere,
          error: { not: null }, // Has error means failed
        },
      });

      // Calculate average duration from completedAt - startedAt
      const executionsWithTimes = await prisma.execution.findMany({
        where: {
          ...executionWhere,
          completedAt: { not: null },
        },
        select: {
          startedAt: true,
          completedAt: true,
        },
        take: 1000, // Limit for performance
      });

      const totalDuration = executionsWithTimes.reduce((sum, exec) => {
        if (exec.completedAt) {
          const duration = exec.completedAt.getTime() - exec.startedAt.getTime();
          return sum + duration;
        }
        return sum;
      }, 0);

      const avgDuration = executionsWithTimes.length > 0
        ? totalDuration / executionsWithTimes.length
        : 0;

      // Count other workflow actions
      const created = await prisma.activity.count({
        where: { ...baseWhere, action: ActivityAction.CREATED },
      });

      const updated = await prisma.activity.count({
        where: { ...baseWhere, action: ActivityAction.UPDATED },
      });

      const archived = await prisma.activity.count({
        where: { ...baseWhere, action: ActivityAction.ARCHIVED },
      });

      return {
        totalExecuted: totalExecutions,
        successCount: successfulExecutions,
        failedCount: failedExecutions,
        successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
        avgDuration: Math.round(avgDuration),
        totalCreated: created,
        totalUpdated: updated,
        totalArchived: archived,
      };
    }),

  /**
   * Get contact analytics
   */
  getContactAnalytics: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        return {
          totalCreated: 0,
          totalUpdated: 0,
          lifecycleChanges: 0,
          avgLeadScore: 0,
          byLifecycleStage: {},
        };
      }

      const dateFilter = input?.dateFrom || input?.dateTo ? {
        createdAt: {
          ...(input?.dateFrom && { gte: input.dateFrom }),
          ...(input?.dateTo && { lte: input.dateTo }),
        },
      } : {};

      const baseWhere = {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
        entityType: "contact",
        ...dateFilter,
      };

      const created = await prisma.activity.count({
        where: { ...baseWhere, action: ActivityAction.CREATED },
      });

      const updated = await prisma.activity.count({
        where: { ...baseWhere, action: ActivityAction.UPDATED },
      });

      // Use UPDATED action with lifecycle changes (since LIFECYCLE_CHANGED doesn't exist in enum)
      const lifecycleChanges = await prisma.activity.count({
        where: {
          ...baseWhere,
          action: ActivityAction.UPDATED,
          changes: {
            path: ["lifecycleStage"],
            not: undefined as any,
          },
        },
      });

      // Get current contact count by lifecycle stage
      const contactsByStage = await prisma.contact.groupBy({
        by: ["lifecycleStage"],
        where: {
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
        },
        _count: true,
      });

      const byLifecycleStage = contactsByStage.reduce((acc, stage) => {
        acc[stage.lifecycleStage] = stage._count;
        return acc;
      }, {} as Record<string, number>);

      // Get average contact score
      const avgScore = await prisma.contact.aggregate({
        where: {
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
        },
        _avg: {
          score: true,
        },
      });

      return {
        totalCreated: created,
        totalUpdated: updated,
        lifecycleChanges,
        avgLeadScore: avgScore._avg?.score || 0,
        byLifecycleStage,
      };
    }),

  /**
   * Get deal analytics
   */
  getDealAnalytics: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        return {
          totalCreated: 0,
          totalUpdated: 0,
          stageChanges: 0,
          wonCount: 0,
          lostCount: 0,
          totalValue: 0,
          avgDealValue: 0,
        };
      }

      const dateFilter = input?.dateFrom || input?.dateTo ? {
        createdAt: {
          ...(input?.dateFrom && { gte: input.dateFrom }),
          ...(input?.dateTo && { lte: input.dateTo }),
        },
      } : {};

      const baseWhere = {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
        entityType: "deal",
        ...dateFilter,
      };

      const created = await prisma.activity.count({
        where: { ...baseWhere, action: ActivityAction.CREATED },
      });

      const updated = await prisma.activity.count({
        where: { ...baseWhere, action: ActivityAction.UPDATED },
      });

      const stageChanges = await prisma.activity.count({
        where: { ...baseWhere, action: ActivityAction.STAGE_CHANGED },
      });

      // Count won/lost from activities
      const wonActivities = await prisma.activity.findMany({
        where: {
          ...baseWhere,
          action: ActivityAction.STAGE_CHANGED,
          metadata: {
            path: ["newStageId"],
            not: null,
          },
        },
        include: {
          _count: true,
        },
      });

      // Get current deal values
      const dealAggregates = await prisma.deal.aggregate({
        where: {
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
        },
        _sum: {
          value: true,
        },
        _avg: {
          value: true,
        },
        _count: true,
      });

      // Count won and lost deals from current state
      const wonCount = await prisma.deal.count({
        where: {
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
          pipelineStage: {
            probability: 100,
          },
        },
      });

      const lostCount = await prisma.deal.count({
        where: {
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
          pipelineStage: {
            probability: 0,
          },
        },
      });

      return {
        totalCreated: created,
        totalUpdated: updated,
        stageChanges,
        wonCount,
        lostCount,
        winRate: (wonCount + lostCount) > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0,
        totalValue: dealAggregates._sum.value ? Number(dealAggregates._sum.value) : 0,
        avgDealValue: dealAggregates._avg.value ? Number(dealAggregates._avg.value) : 0,
      };
    }),

  /**
   * Get user behavior analytics
   */
  getUserBehaviorAnalytics: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        return {
          totalActivities: 0,
          uniqueUsers: 0,
          activitiesByType: {},
          activitiesByAction: {},
        };
      }

      const dateFilter = input?.dateFrom || input?.dateTo ? {
        createdAt: {
          ...(input?.dateFrom && { gte: input.dateFrom }),
          ...(input?.dateTo && { lte: input.dateTo }),
        },
      } : {};

      const baseWhere = {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
        ...dateFilter,
      };

      // Total activities
      const totalActivities = await prisma.activity.count({
        where: baseWhere,
      });

      // Unique users
      const uniqueUsers = await prisma.activity.findMany({
        where: baseWhere,
        select: {
          userId: true,
        },
        distinct: ["userId"],
      });

      // Activities by type
      const byType = await prisma.activity.groupBy({
        by: ["type"],
        where: baseWhere,
        _count: true,
      });

      const activitiesByType = byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>);

      // Activities by action
      const byAction = await prisma.activity.groupBy({
        by: ["action"],
        where: baseWhere,
        _count: true,
      });

      const activitiesByAction = byAction.reduce((acc, item) => {
        acc[item.action] = item._count;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalActivities,
        uniqueUsers: uniqueUsers.length,
        activitiesByType,
        activitiesByAction,
      };
    }),

  /**
   * Get top entities by activity
   */
  getTopEntities: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        limit: z.number().optional().default(10),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        return [];
      }

      const dateFilter = input.dateFrom || input.dateTo ? {
        createdAt: {
          ...(input.dateFrom && { gte: input.dateFrom }),
          ...(input.dateTo && { lte: input.dateTo }),
        },
      } : {};

      const topEntities = await prisma.activity.groupBy({
        by: ["entityId", "entityName"],
        where: {
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
          entityType: input.entityType,
          ...dateFilter,
        },
        _count: true,
        orderBy: {
          _count: {
            entityId: "desc",
          },
        },
        take: input.limit,
      });

      return topEntities.map((entity) => ({
        id: entity.entityId,
        name: entity.entityName,
        activityCount: entity._count,
      }));
    }),
});
