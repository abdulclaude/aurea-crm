import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import type { Node, Edge } from "@xyflow/react";

/**
 * Builds a variable tree for parent workflow context
 * This allows bundle workflows to reference variables from parent workflows
 */
export function buildParentContextVariables(
  currentNodeId: string,
  nodes: Node[],
  edges: Edge[]
): VariableItem | null {
  // Get the current workflow name from the document or context
  // In the editor, we'd need to pass this from the workflow page
  // For now, we'll build a structure that can be used

  const upstreamNodeIds = getUpstreamNodes(currentNodeId, nodes, edges);

  if (upstreamNodeIds.length === 0) {
    return null;
  }

  // Build node entries
  const nodeVariables: VariableItem[] = [];

  for (const nodeId of upstreamNodeIds) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const nodeData = node.data as any;
    const variableName = nodeData?.variableName;

    if (!variableName) continue;

    // Get node name or use type as fallback
    const nodeName = (node.data as any)?.name || node.type || nodeId;

    // Each node's variables are available under the node name
    nodeVariables.push({
      path: `parentContext.{{WorkflowName}}.${nodeName}.${variableName}`,
      label: `${nodeName} → ${variableName}`,
      type: "object",
    });
  }

  if (nodeVariables.length === 0) {
    return null;
  }

  return {
    path: "parentContext",
    label: "Parent Workflow Context",
    type: "object",
    children: nodeVariables,
  };
}

/**
 * Get all node IDs that are upstream from the current node
 */
function getUpstreamNodes(
  currentNodeId: string,
  nodes: Node[],
  edges: Edge[]
): string[] {
  const upstreamNodes = new Set<string>();
  const queue: string[] = [currentNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    // Find all edges that end at this node
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    for (const edge of incomingEdges) {
      const sourceNodeId = edge.source;
      upstreamNodes.add(sourceNodeId);
      queue.push(sourceNodeId);
    }
  }

  return Array.from(upstreamNodes);
}
