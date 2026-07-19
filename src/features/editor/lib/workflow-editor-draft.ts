import type { Edge, Node } from "@xyflow/react";
import { z } from "zod";

const positionSchema = z.object({ x: z.number(), y: z.number() });
const draftNodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  position: positionSchema,
  data: z.record(z.string(), z.unknown()),
});
const draftEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: z.string().optional(),
});

const workflowDraftSchema = z.object({
  baseUpdatedAt: z.string(),
  nodes: z.array(draftNodeSchema),
  edges: z.array(draftEdgeSchema),
});

export type WorkflowGraphSnapshot = {
  nodes: Node[];
  edges: Edge[];
};

const draftKey = (workflowId: string): string =>
  `aurea:workflow-draft:${workflowId}`;

export function createWorkflowGraphSnapshot(
  nodes: Node[],
  edges: Edge[],
): WorkflowGraphSnapshot {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
    })),
  };
}

export function fingerprintWorkflowGraph(
  snapshot: WorkflowGraphSnapshot,
): string {
  return JSON.stringify(snapshot);
}

export function readWorkflowDraft(
  workflowId: string,
  baseUpdatedAt: string,
): WorkflowGraphSnapshot | null {
  try {
    const stored = window.localStorage.getItem(draftKey(workflowId));
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    const draft = workflowDraftSchema.safeParse(parsed);
    if (!draft.success || draft.data.baseUpdatedAt !== baseUpdatedAt) {
      window.localStorage.removeItem(draftKey(workflowId));
      return null;
    }

    return { nodes: draft.data.nodes, edges: draft.data.edges };
  } catch {
    return null;
  }
}

export function writeWorkflowDraft(
  workflowId: string,
  baseUpdatedAt: string,
  snapshot: WorkflowGraphSnapshot,
): void {
  try {
    window.localStorage.setItem(
      draftKey(workflowId),
      JSON.stringify({ baseUpdatedAt, ...snapshot }),
    );
  } catch {
    // Server autosave remains available when browser storage is unavailable.
  }
}

export function clearWorkflowDraft(workflowId: string): void {
  try {
    window.localStorage.removeItem(draftKey(workflowId));
  } catch {
    // There is nothing else to clean up when browser storage is unavailable.
  }
}
