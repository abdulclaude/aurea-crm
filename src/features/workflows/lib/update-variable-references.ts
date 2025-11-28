import type { Node, Edge } from "@xyflow/react";

/**
 * Updates variable references in downstream nodes when a variable name changes
 *
 * @param sourceNodeId - The ID of the node whose variable name changed
 * @param oldVariableName - The previous variable name
 * @param newVariableName - The new variable name
 * @param nodes - All nodes in the workflow
 * @param edges - All edges in the workflow
 * @returns Updated nodes array
 */
export function updateVariableReferences(
  sourceNodeId: string,
  oldVariableName: string,
  newVariableName: string,
  nodes: Node[],
  edges: Edge[]
): Node[] {
  // If variable name hasn't changed, no need to update
  if (oldVariableName === newVariableName) {
    return nodes;
  }

  // Find all downstream nodes (nodes that come after the source node)
  const downstreamNodeIds = getDownstreamNodes(sourceNodeId, nodes, edges);

  // Update each downstream node's data
  return nodes.map((node) => {
    // Only update downstream nodes
    if (!downstreamNodeIds.has(node.id)) {
      return node;
    }

    // Update the node's data by replacing variable references
    const updatedData = replaceVariableInData(
      node.data,
      oldVariableName,
      newVariableName
    );

    return {
      ...node,
      data: updatedData,
    };
  });
}

/**
 * Get all node IDs that are downstream from the source node
 */
function getDownstreamNodes(
  sourceNodeId: string,
  nodes: Node[],
  edges: Edge[]
): Set<string> {
  const downstreamNodes = new Set<string>();
  const queue: string[] = [sourceNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    // Find all edges that start from this node
    const outgoingEdges = edges.filter((edge) => edge.source === nodeId);

    for (const edge of outgoingEdges) {
      const targetNodeId = edge.target;
      downstreamNodes.add(targetNodeId);
      queue.push(targetNodeId);
    }
  }

  return downstreamNodes;
}

/**
 * Recursively replace variable name in data object
 * Handles nested objects and Handlebars templates
 */
function replaceVariableInData(
  data: any,
  oldVariableName: string,
  newVariableName: string
): any {
  if (typeof data === "string") {
    // Replace in Handlebars templates: {{oldVar.path}} -> {{newVar.path}}
    return replaceVariableInTemplate(data, oldVariableName, newVariableName);
  }

  if (Array.isArray(data)) {
    return data.map((item) =>
      replaceVariableInData(item, oldVariableName, newVariableName)
    );
  }

  if (typeof data === "object" && data !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = replaceVariableInData(value, oldVariableName, newVariableName);
    }
    return result;
  }

  return data;
}

/**
 * Replace variable name in Handlebars template strings
 * Handles patterns like {{variableName.property.nested}}
 */
function replaceVariableInTemplate(
  template: string,
  oldVariableName: string,
  newVariableName: string
): string {
  // Match {{variableName...}} patterns
  // Use word boundary to ensure we match the full variable name
  const regex = new RegExp(
    `\\{\\{\\s*${escapeRegExp(oldVariableName)}(\\.|\\s|\\}})`,
    "g"
  );

  return template.replace(regex, (match, suffix) => {
    // Replace the variable name while preserving the rest
    return `{{${newVariableName}${suffix}`;
  });
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
