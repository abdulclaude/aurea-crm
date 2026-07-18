import { TRPCError } from "@trpc/server";
import {
  and,
  avg,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { ActivityAction } from "@/db/enums";
import { db } from "@/db";
import { activity, client, deal, execution, pipelineStage } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

function scopedActivityConditions(
  orgId: string,
  locationId: string | null,
  input?: { dateFrom?: Date; dateTo?: Date }
) {
  const conditions: (SQL | undefined)[] = [eq(activity.organizationId, orgId)];

  if (locationId) {
    conditions.push(eq(activity.locationId, locationId));
  }

  if (input?.dateFrom) {
    conditions.push(gte(activity.createdAt, input.dateFrom));
  }

  if (input?.dateTo) {
    conditions.push(lte(activity.createdAt, input.dateTo));
  }

  return conditions;
}

function scopedEntityConditions(
  table: typeof client | typeof deal,
  orgId: string,
  locationId: string | null
) {
  return and(
    eq(table.organizationId, orgId),
    locationId ? eq(table.locationId, locationId) : undefined
  );
}

export const analyticsRouter = createTRPCRouter({
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
      const locationId = ctx.locationId;

      if (!orgId) {
        return {
          totalExecuted: 0,
          successCount: 0,
          failedCount: 0,
          successRate: 0,
          avgDuration: 0,
          totalCreated: 0,
          totalUpdated: 0,
          totalArchived: 0,
        };
      }

      const executionConditions: (SQL | undefined)[] = [
        eq(execution.organizationId, orgId),
        locationId ? eq(execution.locationId, locationId) : undefined,
        input?.dateFrom ? gte(execution.startedAt, input.dateFrom) : undefined,
        input?.dateTo ? lte(execution.startedAt, input.dateTo) : undefined,
      ];
      const workflowConditions = [
        ...scopedActivityConditions(orgId, locationId, input),
        eq(activity.entityType, "workflow"),
      ];

      const [
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        executionsWithTimes,
        created,
        updated,
        archived,
      ] = await Promise.all([
        db.select({ total: count() }).from(execution).where(and(...executionConditions)),
        db
          .select({ total: count() })
          .from(execution)
          .where(and(...executionConditions, isNull(execution.error))),
        db
          .select({ total: count() })
          .from(execution)
          .where(and(...executionConditions, isNotNull(execution.error))),
        db.query.execution.findMany({
          where: and(...executionConditions, isNotNull(execution.completedAt)),
          columns: { startedAt: true, completedAt: true },
          limit: 1000,
        }),
        db
          .select({ total: count() })
          .from(activity)
          .where(and(...workflowConditions, eq(activity.action, ActivityAction.CREATED))),
        db
          .select({ total: count() })
          .from(activity)
          .where(and(...workflowConditions, eq(activity.action, ActivityAction.UPDATED))),
        db
          .select({ total: count() })
          .from(activity)
          .where(and(...workflowConditions, eq(activity.action, ActivityAction.ARCHIVED))),
      ]);

      const totalDuration = executionsWithTimes.reduce((acc, item) => {
        if (!item.completedAt) {
          return acc;
        }
        return acc + item.completedAt.getTime() - item.startedAt.getTime();
      }, 0);
      const totalExecuted = totalExecutions[0]?.total ?? 0;
      const successCount = successfulExecutions[0]?.total ?? 0;

      return {
        totalExecuted,
        successCount,
        failedCount: failedExecutions[0]?.total ?? 0,
        successRate: totalExecuted > 0 ? (successCount / totalExecuted) * 100 : 0,
        avgDuration:
          executionsWithTimes.length > 0
            ? Math.round(totalDuration / executionsWithTimes.length)
            : 0,
        totalCreated: created[0]?.total ?? 0,
        totalUpdated: updated[0]?.total ?? 0,
        totalArchived: archived[0]?.total ?? 0,
      };
    }),

  getClientAnalytics: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        return {
          totalCreated: 0,
          totalUpdated: 0,
          lifecycleChanges: 0,
          avgLeadScore: 0,
          byLifecycleStage: {},
        };
      }

      const base = [
        ...scopedActivityConditions(ctx.orgId, ctx.locationId, input),
        eq(activity.entityType, "client"),
      ];
      const [created, updated, lifecycleChanges, clientsByStage, avgScore] =
        await Promise.all([
          db
            .select({ total: count() })
            .from(activity)
            .where(and(...base, eq(activity.action, ActivityAction.CREATED))),
          db
            .select({ total: count() })
            .from(activity)
            .where(and(...base, eq(activity.action, ActivityAction.UPDATED))),
          db
            .select({ total: count() })
            .from(activity)
            .where(
              and(
                ...base,
                eq(activity.action, ActivityAction.UPDATED),
                sql`${activity.changes} ? 'lifecycleStage'`
              )
            ),
          db
            .select({
              lifecycleStage: client.lifecycleStage,
              total: count(),
            })
            .from(client)
            .where(scopedEntityConditions(client, ctx.orgId, ctx.locationId))
            .groupBy(client.lifecycleStage),
          db
            .select({ value: avg(client.score) })
            .from(client)
            .where(scopedEntityConditions(client, ctx.orgId, ctx.locationId)),
        ]);

      const byLifecycleStage: Record<string, number> = {};
      for (const row of clientsByStage) {
        if (row.lifecycleStage) {
          byLifecycleStage[row.lifecycleStage] = row.total;
        }
      }

      return {
        totalCreated: created[0]?.total ?? 0,
        totalUpdated: updated[0]?.total ?? 0,
        lifecycleChanges: lifecycleChanges[0]?.total ?? 0,
        avgLeadScore: Number(avgScore[0]?.value ?? 0),
        byLifecycleStage,
      };
    }),

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
      if (!ctx.orgId) {
        return {
          totalCreated: 0,
          totalUpdated: 0,
          stageChanges: 0,
          wonCount: 0,
          lostCount: 0,
          winRate: 0,
          totalValue: 0,
          avgDealValue: 0,
        };
      }

      const base = [
        ...scopedActivityConditions(ctx.orgId, ctx.locationId, input),
        eq(activity.entityType, "deal"),
      ];
      const dealScope = scopedEntityConditions(deal, ctx.orgId, ctx.locationId);
      const [created, updated, stageChanges, aggregates, wonCount, lostCount] =
        await Promise.all([
          db
            .select({ total: count() })
            .from(activity)
            .where(and(...base, eq(activity.action, ActivityAction.CREATED))),
          db
            .select({ total: count() })
            .from(activity)
            .where(and(...base, eq(activity.action, ActivityAction.UPDATED))),
          db
            .select({ total: count() })
            .from(activity)
            .where(and(...base, eq(activity.action, ActivityAction.STAGE_CHANGED))),
          db
            .select({ total: sum(deal.value), average: avg(deal.value) })
            .from(deal)
            .where(dealScope),
          db
            .select({ total: count() })
            .from(deal)
            .innerJoin(pipelineStage, eq(deal.pipelineStageId, pipelineStage.id))
            .where(and(dealScope, eq(pipelineStage.probability, 100))),
          db
            .select({ total: count() })
            .from(deal)
            .innerJoin(pipelineStage, eq(deal.pipelineStageId, pipelineStage.id))
            .where(and(dealScope, eq(pipelineStage.probability, 0))),
        ]);

      const won = wonCount[0]?.total ?? 0;
      const lost = lostCount[0]?.total ?? 0;

      return {
        totalCreated: created[0]?.total ?? 0,
        totalUpdated: updated[0]?.total ?? 0,
        stageChanges: stageChanges[0]?.total ?? 0,
        wonCount: won,
        lostCount: lost,
        winRate: won + lost > 0 ? (won / (won + lost)) * 100 : 0,
        totalValue: Number(aggregates[0]?.total ?? 0),
        avgDealValue: Number(aggregates[0]?.average ?? 0),
      };
    }),

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
      if (!ctx.orgId) {
        return {
          totalActivities: 0,
          uniqueUsers: 0,
          activitiesByType: {},
          activitiesByAction: {},
        };
      }

      const conditions = scopedActivityConditions(ctx.orgId, ctx.locationId, input);
      const [totalActivities, uniqueUsers, byType, byAction] = await Promise.all([
        db.select({ total: count() }).from(activity).where(and(...conditions)),
        db
          .selectDistinct({ userId: activity.userId })
          .from(activity)
          .where(and(...conditions)),
        db
          .select({ type: activity.type, total: count() })
          .from(activity)
          .where(and(...conditions))
          .groupBy(activity.type),
        db
          .select({ action: activity.action, total: count() })
          .from(activity)
          .where(and(...conditions))
          .groupBy(activity.action),
      ]);

      return {
        totalActivities: totalActivities[0]?.total ?? 0,
        uniqueUsers: uniqueUsers.length,
        activitiesByType: Object.fromEntries(
          byType.map((item) => [item.type, item.total])
        ),
        activitiesByAction: Object.fromEntries(
          byAction.map((item) => [item.action, item.total])
        ),
      };
    }),

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
      if (!ctx.orgId) {
        return [];
      }

      const rows = await db
        .select({
          id: activity.entityId,
          name: activity.entityName,
          activityCount: count(),
        })
        .from(activity)
        .where(
          and(
            ...scopedActivityConditions(ctx.orgId, ctx.locationId, input),
            eq(activity.entityType, input.entityType)
          )
        )
        .groupBy(activity.entityId, activity.entityName)
        .orderBy(desc(count()))
        .limit(input.limit);

      return rows;
    }),
});
