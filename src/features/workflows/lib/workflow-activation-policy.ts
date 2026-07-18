import { NodeType } from "@/db/enums";
import { nodeTypeIsAvailable } from "@/features/nodes/lib/node-availability";
import { normalizeIfElseConfig } from "@/features/nodes/executions/components/if-else/schema";
import { studioBookingActionFormSchema } from "@/features/nodes/executions/components/studio-booking-action/config";
import { isWorkflowTriggerNodeType } from "./workflow-node-types";

export type WorkflowActivationNode = {
  id: string;
  type: NodeType;
  data?: unknown;
};

export type WorkflowActivationConnection = {
  fromNodeId: string;
  toNodeId: string;
};

export function getWorkflowActivationIssues(input: {
  isBundle: boolean;
  nodes: readonly WorkflowActivationNode[];
  connections: readonly WorkflowActivationConnection[];
}): string[] {
  const issues: string[] = [];
  const nodeIds = new Set(input.nodes.map((node) => node.id));
  const triggerNodes = input.nodes.filter((node) =>
    isWorkflowTriggerNodeType(node.type),
  );

  if (input.nodes.length === 0) {
    return ["Add at least one node before activating this workflow."];
  }
  if (input.nodes.some((node) => node.type === NodeType.INITIAL)) {
    issues.push("Replace the initial placeholder with configured nodes.");
  }
  if (input.nodes.some((node) => !nodeTypeIsAvailable(node.type))) {
    issues.push("Remove unavailable or legacy nodes before activation.");
  }
  if (
    input.nodes.some(
      (node) =>
        node.type === NodeType.IF_ELSE && !isValidIfElseConfig(node.data),
    )
  ) {
    issues.push("Configure every condition before activation.");
  }
  if (
    input.nodes.some(
      (node) =>
        node.type === NodeType.STUDIO_CLASS_ACTION &&
        !studioBookingActionFormSchema.safeParse(node.data).success,
    )
  ) {
    issues.push("Configure every class and waitlist action before activation.");
  }
  if (input.isBundle && triggerNodes.length > 0) {
    issues.push("Bundle workflows cannot contain trigger nodes.");
  }
  if (!input.isBundle && triggerNodes.length !== 1) {
    issues.push("A workflow must contain exactly one trigger node.");
  }

  const adjacency = new Map<string, string[]>();
  const indegree = new Map(input.nodes.map((node) => [node.id, 0]));
  const edgeKeys = new Set<string>();
  for (const edge of input.connections) {
    const edgeKey = `${edge.fromNodeId}\u0000${edge.toNodeId}`;
    if (
      !nodeIds.has(edge.fromNodeId) ||
      !nodeIds.has(edge.toNodeId) ||
      edge.fromNodeId === edge.toNodeId ||
      edgeKeys.has(edgeKey)
    ) {
      issues.push("Fix invalid or duplicate workflow connections.");
      break;
    }
    edgeKeys.add(edgeKey);
    adjacency.set(edge.fromNodeId, [
      ...(adjacency.get(edge.fromNodeId) ?? []),
      edge.toNodeId,
    ]);
    indegree.set(edge.toNodeId, (indegree.get(edge.toNodeId) ?? 0) + 1);
  }

  const roots = input.nodes.filter((node) => indegree.get(node.id) === 0);
  if (roots.length !== 1) {
    issues.push("Connect all nodes into one workflow path.");
    return [...new Set(issues)];
  }
  if (!input.isBundle && !isWorkflowTriggerNodeType(roots[0].type)) {
    issues.push("The trigger must be the first node in the workflow.");
  }

  const queue = [roots[0].id];
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
  if (visited.size !== input.nodes.length) {
    issues.push("Remove workflow cycles and connect every node.");
  }

  return [...new Set(issues)];
}

function isValidIfElseConfig(data: unknown): boolean {
  try {
    normalizeIfElseConfig(data);
    return true;
  } catch {
    return false;
  }
}
