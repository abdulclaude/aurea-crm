import { db } from "@/db";
import { automationEvent } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import {
  buildAutomationEventDrafts,
  firstString,
  getNestedValue,
  getRecord,
  type TriggerNodeForAutomationEvents,
  type WorkflowForAutomationEvents,
} from "./automation-event-detection";

type RecordAutomationEventsInput = {
  executionId: string;
  workflow: WorkflowForAutomationEvents;
  triggerNode: TriggerNodeForAutomationEvents;
  context: Record<string, unknown>;
};

export async function recordAutomationEventsForExecution({
  executionId,
  workflow,
  triggerNode,
  context,
}: RecordAutomationEventsInput): Promise<number> {
  const organizationId = workflow.organizationId;
  if (!organizationId) {
    return 0;
  }

  const triggerData = getRecord(context.triggerData) ?? {};
  const clientId = firstString(
    getNestedValue(triggerData, "clientId"),
    getNestedValue(triggerData, "client.id"),
  );
  const drafts = buildAutomationEventDrafts({
    workflow,
    triggerNode,
    context,
    triggerData,
    clientId,
  });

  if (drafts.length === 0) {
    return 0;
  }

  const occurredAt = new Date();
  const data = drafts.map((draft) => ({
      id: createId(),
      organizationId,
      locationId: workflow.locationId,
      workflowId: workflow.id,
      executionId,
      clientId: draft.clientId ?? clientId,
      type: draft.type,
      name: draft.name,
      entityType: draft.entityType,
      entityId: draft.entityId,
      sourceNodeType: triggerNode.type,
      sourceNodeId: triggerNode.id,
      metadata: draft.metadata,
      deduplicationKey: [
        executionId,
        draft.type,
        draft.clientId ?? clientId ?? "none",
        draft.entityType ?? "workflow",
        draft.entityId ?? workflow.id,
      ].join(":"),
      occurredAt,
    }));

  const insertedEvents = await db
    .insert(automationEvent)
    .values(data)
    .onConflictDoNothing()
    .returning({ id: automationEvent.id });

  return insertedEvents.length;
}
