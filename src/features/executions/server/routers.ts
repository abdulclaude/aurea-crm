import { PAGINATION } from "@/config/constants";
import { AutomationEventType, ExecutionStatus } from "@/db/enums";
import { db } from "@/db";
import { automationEvent, execution } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import z from "zod";

const workflowColumns = {
  id: true,
  name: true,
  userId: true,
  locationId: true,
} as const;

function executionWhere(locationId: string | null) {
  return locationId ? eq(execution.locationId, locationId) : isNull(execution.locationId);
}

function mapExecution<T extends { workflow: { id: string; name: string } }>(item: T) {
  return {
    ...item,
    Workflows: {
      id: item.workflow.id,
      name: item.workflow.name,
    },
  };
}

export const executionsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await db.query.execution.findFirst({
        where: and(eq(execution.id, input.id), executionWhere(ctx.locationId ?? null)),
        with: { workflow: { columns: workflowColumns } },
      });

      if (!item || item.workflow.userId !== ctx.auth.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Execution not found" });
      }

      return mapExecution(item);
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const items = await db.query.execution.findMany({
      where: executionWhere(ctx.locationId ?? null),
      orderBy: desc(execution.startedAt),
      with: { workflow: { columns: workflowColumns } },
    });

    return items
      .filter((item) => item.workflow.userId === ctx.auth.user.id)
      .map(mapExecution);
  }),

  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;
      const allItems = await db.query.execution.findMany({
        where: executionWhere(ctx.locationId ?? null),
        orderBy: desc(execution.startedAt),
        with: { workflow: { columns: workflowColumns } },
      });
      const scopedItems = allItems.filter((item) => item.workflow.userId === ctx.auth.user.id);
      const items = scopedItems.slice((page - 1) * pageSize, page * pageSize).map(mapExecution);
      const totalCount = scopedItems.length;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),

  getAutomationInsights: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const executions = (
        await db.query.execution.findMany({
          where: and(executionWhere(ctx.locationId ?? null), gte(execution.startedAt, since)),
          orderBy: desc(execution.startedAt),
          columns: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
          },
          with: { workflow: { columns: workflowColumns } },
        })
      ).filter((item) => item.workflow.userId === ctx.auth.user.id);

      const automationEvents = (
        await db.query.automationEvent.findMany({
          where: and(
            gte(automationEvent.occurredAt, since),
            ctx.orgId ? eq(automationEvent.organizationId, ctx.orgId) : undefined,
            ctx.locationId ? eq(automationEvent.locationId, ctx.locationId) : isNull(automationEvent.locationId)
          ),
          orderBy: desc(automationEvent.occurredAt),
          columns: {
            id: true,
            type: true,
            name: true,
            workflowId: true,
            occurredAt: true,
          },
          with: {
            workflow: { columns: workflowColumns },
            client: { columns: { id: true, name: true } },
          },
        })
      ).filter((event) => !event.workflow || event.workflow.userId === ctx.auth.user.id);

      const summary = {
        totalExecutions: executions.length,
        successfulExecutions: 0,
        failedExecutions: 0,
        membershipSignupAutomations: 0,
        introOfferAutomations: 0,
        leadToMemberConversions: 0,
        classMilestoneAutomations: 0,
      };
      const workflowStats = new Map<
        string,
        {
          workflowId: string;
          workflowName: string;
          executions: number;
          successes: number;
          failures: number;
          conversions: number;
        }
      >();

      for (const item of executions) {
        const workflow = item.workflow;
        const workflowStat =
          workflowStats.get(workflow.id) ??
          {
            workflowId: workflow.id,
            workflowName: workflow.name,
            executions: 0,
            successes: 0,
            failures: 0,
            conversions: 0,
          };

        workflowStat.executions += 1;

        if (item.status === ExecutionStatus.SUCCESS) {
          summary.successfulExecutions += 1;
          workflowStat.successes += 1;
        }

        if (item.status === ExecutionStatus.FAILED) {
          summary.failedExecutions += 1;
          workflowStat.failures += 1;
        }

        workflowStats.set(workflow.id, workflowStat);
      }

      for (const event of automationEvents) {
        const workflow = event.workflow;
        if (!workflow) continue;

        const workflowStat =
          workflowStats.get(workflow.id) ??
          {
            workflowId: workflow.id,
            workflowName: workflow.name,
            executions: 0,
            successes: 0,
            failures: 0,
            conversions: 0,
          };

        switch (event.type) {
          case AutomationEventType.MEMBERSHIP_SIGNUP:
            summary.membershipSignupAutomations += 1;
            workflowStat.conversions += 1;
            break;
          case AutomationEventType.INTRO_OFFER_REDEEMED:
          case AutomationEventType.INTRO_OFFER_COMPLETED:
            summary.introOfferAutomations += 1;
            workflowStat.conversions += 1;
            break;
          case AutomationEventType.CLASS_MILESTONE:
            summary.classMilestoneAutomations += 1;
            workflowStat.conversions += 1;
            break;
          case AutomationEventType.LEAD_CONVERTED:
            summary.leadToMemberConversions += 1;
            workflowStat.conversions += 1;
            break;
          default:
            break;
        }

        workflowStats.set(workflow.id, workflowStat);
      }

      const conversionSignals =
        summary.membershipSignupAutomations +
        summary.introOfferAutomations +
        summary.leadToMemberConversions +
        summary.classMilestoneAutomations;

      return {
        days,
        summary: {
          ...summary,
          conversionSignals,
          successRate:
            summary.totalExecutions > 0
              ? (summary.successfulExecutions / summary.totalExecutions) * 100
              : 0,
          conversionRate:
            summary.successfulExecutions > 0
              ? (conversionSignals / summary.successfulExecutions) * 100
              : 0,
        },
        workflows: Array.from(workflowStats.values())
          .sort((a, b) => b.conversions - a.conversions || b.executions - a.executions)
          .slice(0, 12),
        recentEvents: automationEvents.slice(0, 25).map((event) => ({
          id: event.id,
          type: event.type,
          name: event.name,
          occurredAt: event.occurredAt,
          workflowName: event.workflow?.name ?? "Deleted workflow",
          clientName: event.client?.name ?? null,
        })),
      };
    }),
});
