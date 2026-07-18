import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";

import { PAGINATION } from "@/config/constants";
import { db } from "@/db";
import { ExecutionStatus } from "@/db/enums";
import { execution, workflows } from "@/db/schema";
import { automationEventExplorerInputSchema } from "@/features/executions/server/automation-event-contracts";
import { getAutomationEventExplorer } from "@/features/executions/server/automation-event-explorer";
import { getAutomationInsights } from "@/features/executions/server/automation-insights-service";
import { workflowViewProcedure } from "@/features/executions/server/workflow-procedures";
import { createTRPCRouter } from "@/trpc/init";

const workflowColumns = {
  id: true,
  name: true,
  locationId: true,
} as const;

function executionWhere(organizationId: string, locationId: string | null) {
  return and(
    eq(execution.organizationId, organizationId),
    locationId
      ? eq(execution.locationId, locationId)
      : isNull(execution.locationId),
  );
}

function mapExecution<T extends { workflow: { id: string; name: string } }>(
  item: T,
) {
  return {
    ...item,
    Workflows: { id: item.workflow.id, name: item.workflow.name },
  };
}

export const executionsRouter = createTRPCRouter({
  getOne: workflowViewProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution not found",
        });
      }
      const item = await db.query.execution.findFirst({
        where: and(
          eq(execution.id, input.id),
          executionWhere(ctx.orgId, ctx.locationId ?? null),
        ),
        with: { workflow: { columns: workflowColumns } },
      });
      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution not found",
        });
      }
      return mapExecution(item);
    }),

  getAll: workflowViewProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) return [];
    const items = await db.query.execution.findMany({
      where: executionWhere(ctx.orgId, ctx.locationId ?? null),
      orderBy: desc(execution.startedAt),
      with: { workflow: { columns: workflowColumns } },
    });
    return items.map(mapExecution);
  }),

  getMany: workflowViewProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .int()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().trim().max(200).default(""),
        workflowId: z.string().max(200).default(""),
        status: z.enum(["ALL", "RUNNING", "SUCCESS", "FAILED"]).default("ALL"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;
      if (!ctx.orgId) {
        return {
          items: [],
          page,
          pageSize,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          summary: { all: 0, running: 0, success: 0, failed: 0 },
        };
      }
      const scopeWhere = and(
        executionWhere(ctx.orgId, ctx.locationId ?? null),
        input.search ? ilike(workflows.name, `%${input.search}%`) : undefined,
        input.workflowId ? eq(workflows.id, input.workflowId) : undefined,
      );
      const filteredWhere = and(
        scopeWhere,
        input.status !== "ALL" ? eq(execution.status, input.status) : undefined,
      );
      const [itemRows, totalRows, statusRows] = await Promise.all([
        db
          .select({
            id: execution.id,
            status: execution.status,
            startedAt: execution.startedAt,
            completedAt: execution.completedAt,
            error: execution.error,
            output: execution.output,
            workflow: { id: workflows.id, name: workflows.name },
          })
          .from(execution)
          .innerJoin(workflows, eq(execution.workflowId, workflows.id))
          .where(filteredWhere)
          .orderBy(desc(execution.startedAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db
          .select({ value: count() })
          .from(execution)
          .innerJoin(workflows, eq(execution.workflowId, workflows.id))
          .where(filteredWhere),
        db
          .select({ status: execution.status, value: count() })
          .from(execution)
          .innerJoin(workflows, eq(execution.workflowId, workflows.id))
          .where(scopeWhere)
          .groupBy(execution.status),
      ]);
      const items = itemRows.map(mapExecution);
      const totalCount = totalRows[0]?.value ?? 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      const summary = {
        all: 0,
        running: 0,
        success: 0,
        failed: 0,
      };
      for (const row of statusRows) {
        summary.all += row.value;
        if (row.status === ExecutionStatus.RUNNING) summary.running = row.value;
        if (row.status === ExecutionStatus.SUCCESS) summary.success = row.value;
        if (row.status === ExecutionStatus.FAILED) summary.failed = row.value;
      }
      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        summary,
      };
    }),

  getAutomationInsights: workflowViewProcedure
    .input(
      z
        .object({ days: z.number().int().min(1).max(365).default(30) })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Select an organization to view automation insights.",
        });
      }
      return getAutomationInsights({
        scope: {
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
        },
        days: input?.days ?? 30,
      });
    }),

  getAutomationEvents: workflowViewProcedure
    .input(automationEventExplorerInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Select an organization to view automation events.",
        });
      }
      return getAutomationEventExplorer({
        scope: {
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
        },
        filters: input,
      });
    }),
});
