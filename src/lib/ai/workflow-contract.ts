import { z } from "zod";

import type { JsonObject, JsonValue } from "@/db/json";

export type WorkflowNodeDefinition = {
  type: string;
};

export const GENERATED_WORKFLOW_DRAFT_STATE = {
  archived: true,
} as const;

export interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    position: { x: number; y: number };
    data: JsonObject;
  }>;
  connections: Array<{
    sourceId: string;
    targetId: string;
  }>;
}

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

const GeneratedWorkflowSchema: z.ZodType<GeneratedWorkflow> = z.object({
  name: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(5_000),
  nodes: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(200),
        name: z.string().trim().min(1).max(500),
        type: z.string().trim().min(1).max(200),
        position: z.object({
          x: z.number().finite(),
          y: z.number().finite(),
        }),
        data: z.record(z.string(), JsonValueSchema),
      }),
    )
    .min(1)
    .max(100),
  connections: z
    .array(
      z.object({
        sourceId: z.string().trim().min(1).max(200),
        targetId: z.string().trim().min(1).max(200),
      }),
    )
    .max(200),
});

export function parseGeneratedWorkflow(input: {
  text: string;
  mode: "workflow" | "bundle";
  triggerDefinitions: readonly WorkflowNodeDefinition[];
  executionDefinitions: readonly WorkflowNodeDefinition[];
}): GeneratedWorkflow | null {
  const jsonMatch = input.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let json: unknown;
  try {
    json = JSON.parse(jsonMatch[0]) as unknown;
  } catch {
    return null;
  }

  const parsed = GeneratedWorkflowSchema.safeParse(json);
  if (!parsed.success) return null;
  const workflow = parsed.data;
  const nodeIds = new Set(workflow.nodes.map((node) => node.id));
  if (nodeIds.size !== workflow.nodes.length) return null;

  const triggerTypes = new Set(
    input.triggerDefinitions.map((node) => node.type),
  );
  const executionTypes = new Set(
    input.executionDefinitions.map((node) => node.type),
  );
  const triggerNodes = workflow.nodes.filter((node) =>
    triggerTypes.has(node.type),
  );
  if (input.mode === "workflow" && triggerNodes.length !== 1) return null;
  if (input.mode === "bundle" && triggerNodes.length !== 0) return null;
  if (
    workflow.nodes.some(
      (node) =>
        !triggerTypes.has(node.type) && !executionTypes.has(node.type),
    )
  ) {
    return null;
  }

  const adjacency = new Map<string, string[]>();
  const indegree = new Map(workflow.nodes.map((node) => [node.id, 0]));
  const edges = new Set<string>();
  for (const connection of workflow.connections) {
    if (
      !nodeIds.has(connection.sourceId) ||
      !nodeIds.has(connection.targetId) ||
      connection.sourceId === connection.targetId
    ) {
      return null;
    }
    const edgeKey = `${connection.sourceId}\u0000${connection.targetId}`;
    if (edges.has(edgeKey)) return null;
    edges.add(edgeKey);
    adjacency.set(connection.sourceId, [
      ...(adjacency.get(connection.sourceId) ?? []),
      connection.targetId,
    ]);
    indegree.set(
      connection.targetId,
      (indegree.get(connection.targetId) ?? 0) + 1,
    );
  }

  const roots = workflow.nodes.filter((node) => indegree.get(node.id) === 0);
  if (roots.length !== 1) return null;
  if (
    input.mode === "workflow" &&
    roots[0]?.id !== triggerNodes[0]?.id
  ) {
    return null;
  }

  const queue = roots.map((node) => node.id);
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    for (const target of adjacency.get(current) ?? []) {
      const remaining = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, remaining);
      if (remaining === 0) queue.push(target);
    }
  }

  return visited.size === workflow.nodes.length ? workflow : null;
}
