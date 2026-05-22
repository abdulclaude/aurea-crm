import { db } from "@/db";
import { NodeType } from "@/db/enums";
import { node, workflows as workflowsTable } from "@/db/schema";

import { sendWorkflowExecution } from "@/inngest/utils";
import { and, eq, isNull } from "drizzle-orm";

type TriggerWorkflowInput = {
  nodeType: NodeType;
  organizationId: string;
  locationId?: string | null;
  triggerData: Record<string, unknown>;
  shouldTriggerNode?: (node: TriggerWorkflowNode) => boolean;
};

type TriggerWorkflowNode = {
  type: NodeType;
  data: JsonValue;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const toJsonValue = (value: unknown): JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (typeof value === "object") {
    const result: { [key: string]: JsonValue } = {};
    const record = value as Record<string, unknown>;
    for (const [key, item] of Object.entries(record)) {
      result[key] = toJsonValue(item);
    }
    return result;
  }

  return null;
};

export async function triggerWorkflowsForNodeType({
  nodeType,
  organizationId,
  locationId,
  triggerData,
  shouldTriggerNode,
}: TriggerWorkflowInput): Promise<number> {
  const rows = await db
    .select({
      workflowId: workflowsTable.id,
      nodeType: node.type,
      nodeData: node.data,
    })
    .from(workflowsTable)
    .innerJoin(
      node,
      and(eq(node.workflowId, workflowsTable.id), eq(node.type, nodeType))
    )
    .where(
      and(
        eq(workflowsTable.organizationId, organizationId),
        locationId
          ? eq(workflowsTable.locationId, locationId)
          : isNull(workflowsTable.locationId),
        eq(workflowsTable.archived, false),
        eq(workflowsTable.isTemplate, false)
      )
    );

  const workflows = Array.from(
    rows
      .reduce((byWorkflow, row) => {
        const workflow = byWorkflow.get(row.workflowId) ?? {
          id: row.workflowId,
          Node: [] as TriggerWorkflowNode[],
        };
        workflow.Node.push({
          type: row.nodeType,
          data: toJsonValue(row.nodeData),
        });
        byWorkflow.set(row.workflowId, workflow);
        return byWorkflow;
      }, new Map<string, { id: string; Node: TriggerWorkflowNode[] }>())
      .values()
  );

  const workflowsToRun = shouldTriggerNode
    ? workflows.filter((workflow) => workflow.Node.some(shouldTriggerNode))
    : workflows;

  await Promise.all(
    workflowsToRun.map((workflow) =>
      sendWorkflowExecution({
        workflowId: workflow.id,
        initialData: {
          triggerData,
        },
      }),
    ),
  );

  return workflowsToRun.length;
}
