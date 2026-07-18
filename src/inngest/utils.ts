import toposort from "toposort";

import type { NodeType } from "@/db/enums";
import { NonRetriableError } from "inngest";
import { inngest } from "./client";

import { createId } from "@paralleldrive/cuid2";

type WorkflowNode = {
  id: string;
  name: string;
  type: NodeType;
  data: unknown;
};

type WorkflowConnection = {
  fromNodeId: string;
  toNodeId: string;
};

export const topologicalSort = <TNode extends WorkflowNode>(
  nodes: TNode[],
  connections: WorkflowConnection[]
): TNode[] => {
  // if no connections, return node as-is (they are all independent)

  if (connections.length === 0) {
    throw new NonRetriableError("Cannot execute a connectionless workflow.");
  }

  // create edges array for toposort

  const edges: [string, string][] = connections.map((conn) => [
    conn.fromNodeId,
    conn.toNodeId,
  ]);

  // add nodes with no connections as self-edges to ensure they're included

  const connectedNodeIds = new Set<string>();

  for (const conn of connections) {
    connectedNodeIds.add(conn.fromNodeId);
    connectedNodeIds.add(conn.toNodeId);
  }

  for (const node of nodes) {
    if (!connectedNodeIds.has(node.id)) {
      edges.push([node.id, node.id]);
    }
  }

  // perform topological sort

  let sortedNodeIds: string[];

  try {
    sortedNodeIds = toposort(edges);

    //  remove duplicates (from self-edges)
    sortedNodeIds = [...new Set(sortedNodeIds)];
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cyclic")) {
      throw new Error("Workflow contains a cycle.");
    }

    throw error;
  }

  // map sorted ids back to node objects

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return sortedNodeIds.map((id) => nodeMap.get(id)!).filter(Boolean);
};

export const sendWorkflowExecution = async (data: {
  workflowId: string;
  idempotencyKey?: string;
} & Record<string, unknown>) => {
  const { idempotencyKey, ...eventData } = data;
  return inngest.send({
    name: "workflows/execute.workflow",
    data: eventData,
    id: idempotencyKey ?? createId(),
  });
};
