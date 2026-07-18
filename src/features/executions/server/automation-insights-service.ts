import "server-only";

import { and, desc, eq, gte, isNull } from "drizzle-orm";

import { db } from "@/db";
import { ExecutionStatus } from "@/db/enums";
import { automationEvent, execution } from "@/db/schema";
import {
  countConvertedSuccessfulExecutions,
  isAutomationConversionEvent,
  summarizeAutomationSignalTypes,
} from "@/features/executions/server/automation-event-contracts";

type AutomationInsightsScope = {
  organizationId: string;
  locationId: string | null;
};

export async function getAutomationInsights(input: {
  scope: AutomationInsightsScope;
  days: number;
}) {
  const since = new Date();
  since.setDate(since.getDate() - input.days);
  const locationExecutionScope = input.scope.locationId
    ? eq(execution.locationId, input.scope.locationId)
    : isNull(execution.locationId);
  const locationEventScope = input.scope.locationId
    ? eq(automationEvent.locationId, input.scope.locationId)
    : isNull(automationEvent.locationId);

  const [executions, events] = await Promise.all([
    db.query.execution.findMany({
      where: and(
        eq(execution.organizationId, input.scope.organizationId),
        locationExecutionScope,
        gte(execution.startedAt, since),
      ),
      orderBy: desc(execution.startedAt),
      columns: { id: true, status: true },
      with: { workflow: { columns: { id: true, name: true } } },
    }),
    db.query.automationEvent.findMany({
      where: and(
        eq(automationEvent.organizationId, input.scope.organizationId),
        locationEventScope,
        gte(automationEvent.occurredAt, since),
      ),
      orderBy: desc(automationEvent.occurredAt),
      columns: {
        id: true,
        type: true,
        name: true,
        executionId: true,
        occurredAt: true,
      },
      with: {
        workflow: { columns: { id: true, name: true } },
        client: { columns: { id: true, name: true } },
      },
    }),
  ]);

  const summary = {
    totalExecutions: executions.length,
    successfulExecutions: 0,
    failedExecutions: 0,
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
    const stat = workflowStats.get(item.workflow.id) ?? {
      workflowId: item.workflow.id,
      workflowName: item.workflow.name,
      executions: 0,
      successes: 0,
      failures: 0,
      conversions: 0,
    };
    stat.executions += 1;
    if (item.status === ExecutionStatus.SUCCESS) {
      summary.successfulExecutions += 1;
      stat.successes += 1;
    } else if (item.status === ExecutionStatus.FAILED) {
      summary.failedExecutions += 1;
      stat.failures += 1;
    }
    workflowStats.set(item.workflow.id, stat);
  }

  const successfulExecutionIds = new Set(
    executions
      .filter(({ status }) => status === ExecutionStatus.SUCCESS)
      .map(({ id }) => id),
  );
  for (const event of events) {
    if (!isAutomationConversionEvent(event.type)) continue;
    if (!event.workflow) continue;
    const stat = workflowStats.get(event.workflow.id) ?? {
      workflowId: event.workflow.id,
      workflowName: event.workflow.name,
      executions: 0,
      successes: 0,
      failures: 0,
      conversions: 0,
    };
    stat.conversions += 1;
    workflowStats.set(event.workflow.id, stat);
  }

  const conversionSignals = events.filter(({ type }) =>
    isAutomationConversionEvent(type),
  ).length;
  const convertedExecutions = countConvertedSuccessfulExecutions(
    events,
    successfulExecutionIds,
  );
  const signalSummary = summarizeAutomationSignalTypes(
    events.map(({ type }) => type),
  );
  return {
    days: input.days,
    summary: {
      ...summary,
      ...signalSummary,
      conversionSignals,
      convertedExecutions,
      successRate:
        summary.totalExecutions > 0
          ? (summary.successfulExecutions / summary.totalExecutions) * 100
          : 0,
      conversionRate:
        summary.successfulExecutions > 0
          ? (convertedExecutions / summary.successfulExecutions) * 100
          : 0,
    },
    workflows: Array.from(workflowStats.values())
      .sort(
        (a, b) =>
          b.conversions - a.conversions || b.executions - a.executions,
      )
      .slice(0, 12),
    recentEvents: events.slice(0, 25).map((event) => ({
      id: event.id,
      type: event.type,
      name: event.name,
      occurredAt: event.occurredAt,
      workflowName: event.workflow?.name ?? "Deleted workflow",
      clientName: event.client?.name ?? null,
    })),
  };
}
