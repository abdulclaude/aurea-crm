import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  or,
} from "drizzle-orm";

import { db } from "@/db";
import { automationEvent, client, workflows } from "@/db/schema";
import type { AutomationEventExplorerInput } from "@/features/executions/server/automation-event-contracts";

type AutomationEventScope = {
  organizationId: string;
  locationId: string | null;
};

function scopeCondition(scope: AutomationEventScope) {
  return and(
    eq(automationEvent.organizationId, scope.organizationId),
    scope.locationId
      ? eq(automationEvent.locationId, scope.locationId)
      : isNull(automationEvent.locationId),
  );
}

function workflowJoinCondition(scope: AutomationEventScope) {
  return and(
    eq(workflows.id, automationEvent.workflowId),
    eq(workflows.organizationId, scope.organizationId),
    scope.locationId
      ? eq(workflows.locationId, scope.locationId)
      : isNull(workflows.locationId),
  );
}

function clientJoinCondition(scope: AutomationEventScope) {
  return and(
    eq(client.id, automationEvent.clientId),
    eq(client.organizationId, scope.organizationId),
    scope.locationId
      ? eq(client.locationId, scope.locationId)
      : isNull(client.locationId),
  );
}

export async function getAutomationEventExplorer(input: {
  scope: AutomationEventScope;
  filters: AutomationEventExplorerInput;
}) {
  const since = new Date();
  since.setDate(since.getDate() - input.filters.days);
  const escapedClientSearch = input.filters.clientSearch.replace(
    /[\\%_]/g,
    "\\$&",
  );
  const where = and(
    scopeCondition(input.scope),
    gte(automationEvent.occurredAt, since),
    input.filters.eventType
      ? eq(automationEvent.type, input.filters.eventType)
      : undefined,
    input.filters.workflowId
      ? eq(automationEvent.workflowId, input.filters.workflowId)
      : undefined,
    input.filters.clientId
      ? eq(automationEvent.clientId, input.filters.clientId)
      : undefined,
    escapedClientSearch
      ? or(
          ilike(client.name, `%${escapedClientSearch}%`),
          ilike(client.email, `%${escapedClientSearch}%`),
        )
      : undefined,
    input.filters.sourceNodeType
      ? eq(automationEvent.sourceNodeType, input.filters.sourceNodeType)
      : undefined,
  );
  const offset = (input.filters.page - 1) * input.filters.pageSize;

  const [rows, totalRows, eventTypes, workflowOptions, sourceTypes] =
    await Promise.all([
      db
        .select({
          id: automationEvent.id,
          type: automationEvent.type,
          name: automationEvent.name,
          workflowId: automationEvent.workflowId,
          workflowName: workflows.name,
          executionId: automationEvent.executionId,
          clientId: automationEvent.clientId,
          clientName: client.name,
          entityType: automationEvent.entityType,
          entityId: automationEvent.entityId,
          sourceNodeType: automationEvent.sourceNodeType,
          value: automationEvent.value,
          occurredAt: automationEvent.occurredAt,
        })
        .from(automationEvent)
        .leftJoin(workflows, workflowJoinCondition(input.scope))
        .leftJoin(client, clientJoinCondition(input.scope))
        .where(where)
        .orderBy(desc(automationEvent.occurredAt), desc(automationEvent.id))
        .limit(input.filters.pageSize)
        .offset(offset),
      db
        .select({ value: count() })
        .from(automationEvent)
        .leftJoin(client, clientJoinCondition(input.scope))
        .where(where),
      db
        .selectDistinct({ value: automationEvent.type })
        .from(automationEvent)
        .where(scopeCondition(input.scope))
        .orderBy(asc(automationEvent.type)),
      db
        .selectDistinct({ id: workflows.id, name: workflows.name })
        .from(automationEvent)
        .innerJoin(workflows, workflowJoinCondition(input.scope))
        .where(scopeCondition(input.scope))
        .orderBy(asc(workflows.name), asc(workflows.id))
        .limit(100),
      db
        .selectDistinct({ value: automationEvent.sourceNodeType })
        .from(automationEvent)
        .where(
          and(
            scopeCondition(input.scope),
            isNotNull(automationEvent.sourceNodeType),
          ),
        )
        .orderBy(asc(automationEvent.sourceNodeType)),
    ]);

  const totalCount = totalRows[0]?.value ?? 0;
  const totalPages = Math.ceil(totalCount / input.filters.pageSize);
  return {
    items: rows,
    page: input.filters.page,
    pageSize: input.filters.pageSize,
    totalCount,
    totalPages,
    options: {
      eventTypes: eventTypes.map(({ value }) => value),
      workflows: workflowOptions,
      sourceNodeTypes: sourceTypes.flatMap(({ value }) =>
        value ? [value] : [],
      ),
    },
  };
}
