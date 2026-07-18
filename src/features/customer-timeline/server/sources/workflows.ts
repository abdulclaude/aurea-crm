import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { automationEvent, workflows } from "@/db/schema";
import type {
  CustomerTimelineCursor,
  CustomerTimelineEvent,
} from "@/features/customer-timeline/contracts";
import {
  locationScopeCondition,
  timelineCursorCondition,
  type CustomerTimelineScope,
} from "@/features/customer-timeline/server/timeline-query";

export async function listWorkflowTimelineEvents(input: {
  scope: CustomerTimelineScope;
  cursor?: CustomerTimelineCursor;
  limit: number;
}): Promise<CustomerTimelineEvent[]> {
  const rows = await db
    .select({
      id: automationEvent.id,
      name: automationEvent.name,
      type: automationEvent.type,
      occurredAt: automationEvent.occurredAt,
      workflowName: workflows.name,
    })
    .from(automationEvent)
    .leftJoin(workflows, eq(workflows.id, automationEvent.workflowId))
    .where(
      and(
        eq(automationEvent.organizationId, input.scope.organizationId),
        locationScopeCondition(
          automationEvent.locationId,
          input.scope.locationId,
        ),
        eq(automationEvent.clientId, input.scope.clientId),
        timelineCursorCondition({
          occurredAt: automationEvent.occurredAt,
          id: automationEvent.id,
          prefix: "workflow",
          cursor: input.cursor,
        }),
      ),
    )
    .orderBy(desc(automationEvent.occurredAt), desc(automationEvent.id))
    .limit(input.limit + 1);

  return rows.map(
    (row): CustomerTimelineEvent => ({
      id: `workflow:${row.id}`,
      kind: "WORKFLOW",
      title: row.name,
      description: row.workflowName ?? "Workflow automation",
      status: row.type,
      occurredAt: row.occurredAt,
      secondaryAt: null,
      money: null,
      channel: null,
    }),
  );
}
