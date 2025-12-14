import { NonRetriableError } from "inngest";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import type { NodeExecutor } from "@/features/executions/types";
import { NodeType } from "@prisma/client";
import { bundleWorkflowChannel } from "@/inngest/channels/bundle-workflow";
import { topologicalSort } from "@/inngest/utils";
import prisma from "@/lib/db";
import type { BundleWorkflowFormValues } from "./dialog";

// Helper function to get nested values from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

// Resolve variables in a value string
function resolveVariables(
  value: string,
  context: Record<string, unknown>
): unknown {
  const matches = value.match(/\{\{(.+?)\}\}/g);

  if (!matches) {
    // No variables, return as-is (could be static value)
    return value;
  }

  let resolved = value;
  for (const match of matches) {
    const path = match.slice(2, -2).trim();

    // Try to get value from context.variables first, then root context
    let varValue = getNestedValue(
      context.variables as Record<string, unknown>,
      path
    );
    if (varValue === undefined) {
      varValue = getNestedValue(context, path);
    }

    resolved = resolved.replace(match, String(varValue ?? ""));
  }

  // Try to parse as JSON if it looks like JSON
  if (
    (resolved.startsWith("{") && resolved.endsWith("}")) ||
    (resolved.startsWith("[") && resolved.endsWith("]"))
  ) {
    try {
      return JSON.parse(resolved);
    } catch {
      return resolved;
    }
  }

  // Try to parse as number
  if (!Number.isNaN(Number(resolved)) && resolved.trim() !== "") {
    return Number(resolved);
  }

  // Parse boolean
  if (resolved === "true" || resolved === "false") {
    return resolved === "true";
  }

  return resolved;
}

export const bundleWorkflowExecutor: NodeExecutor = async (params) => {
  const {
    data,
    nodeId,
    context,
    step,
    publish,
    userId,
    nodeLevelContext,
    parentWorkflow,
  } = params;
  const config = data as BundleWorkflowFormValues;

  // Publish loading status
  await step.run(`bundle-workflow-${nodeId}-publish-loading`, async () => {
    await publish(
      bundleWorkflowChannel().status({ nodeId, status: "loading" })
    );
  });

  try {
    // Load the bundle workflow
    const bundleWorkflow = await step.run("load-bundle-workflow", async () => {
      const workflow = await prisma.workflows.findUnique({
        where: { id: config.bundleWorkflowId },
        include: {
          Node: true,
          Connection: true,
        },
      });

      if (!workflow) {
        throw new NonRetriableError(
          `Bundle workflow ${config.bundleWorkflowId} not found`
        );
      }

      if (!workflow.isBundle) {
        throw new NonRetriableError(
          `Workflow ${config.bundleWorkflowId} is not a bundle workflow`
        );
      }

      return workflow;
    });

    // Prepare bundle inputs from mappings
    const bundleInputs: Record<string, unknown> = {};
    const bundleInputDefinitions = bundleWorkflow.bundleInputs as
      | Array<{ name: string; type: string; defaultValue?: unknown }>
      | undefined;

    // Map parent variables into bundle inputs
    for (const mapping of config.inputMappings || []) {
      const resolvedValue = resolveVariables(mapping.value, context);
      bundleInputs[mapping.bundleInputName] = resolvedValue;
    }

    // Add default values for unmapped inputs
    if (bundleInputDefinitions) {
      for (const inputDef of bundleInputDefinitions) {
        if (
          bundleInputs[inputDef.name] === undefined &&
          inputDef.defaultValue !== undefined
        ) {
          bundleInputs[inputDef.name] = inputDef.defaultValue;
        }
      }
    }

    // Build parent workflow context organized by workflow name and node names
    const parentContext: Record<
      string,
      Record<string, Record<string, unknown>>
    > = {};

    if (parentWorkflow && nodeLevelContext) {
      // Create parent workflow namespace
      const workflowNamespace: Record<string, Record<string, unknown>> = {};

      // Populate with each node's contribution (keys are node names, not IDs)
      for (const [nodeName, nodeData] of nodeLevelContext.entries()) {
        workflowNamespace[nodeName] = nodeData;
      }

      // Store under parent workflow name
      parentContext[parentWorkflow.workflowName] = workflowNamespace;
    }

    // Create isolated execution context for bundle
    let bundleContext: Record<string, unknown> = {
      ...bundleInputs, // Bundle inputs are directly accessible
      parentContext, // Parent workflow context organized by workflow -> node -> variables
      variables: {
        ...bundleInputs, // Also available under variables
        parentContext, // Also available under variables namespace
      },
    };

    // Execute bundle workflow nodes in topological order
    const sortedNodes = topologicalSort(
      bundleWorkflow.Node as any,
      bundleWorkflow.Connection as any
    );

    // Build adjacency map for conditional branching
    const adjacencyMap = new Map<
      string,
      Array<{ toNodeId: string; fromOutput: string }>
    >();
    for (const conn of bundleWorkflow.Connection) {
      if (!adjacencyMap.has(conn.fromNodeId)) {
        adjacencyMap.set(conn.fromNodeId, []);
      }
      adjacencyMap.get(conn.fromNodeId)!.push({
        toNodeId: conn.toNodeId,
        fromOutput: conn.fromOutput,
      });
    }

    // Track which nodes are reachable
    const reachableNodes = new Set<string>();

    // Find trigger node (MANUAL_TRIGGER or INITIAL in bundle workflows)
    const targetNodeIds = new Set(
      bundleWorkflow.Connection.map((c: any) => c.toNodeId)
    );
    const triggerNode = sortedNodes.find((node) => !targetNodeIds.has(node.id));

    if (triggerNode) {
      reachableNodes.add(triggerNode.id);
    }

    // Execute nodes
    for (const node of sortedNodes) {
      if (!reachableNodes.has(node.id)) {
        continue;
      }

      if (bundleContext.shouldStop) {
        break;
      }

      // Execute the node
      const executor = getExecutor(node.type as NodeType);
      bundleContext = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        context: bundleContext,
        step,
        publish,
        // Pass parent workflow info - bundle workflows can be nested
        parentWorkflow: {
          workflowId: bundleWorkflow.id,
          workflowName: bundleWorkflow.name,
          isBundle: true,
        },
        // Don't pass nodeLevelContext to nested bundles (they get parent context via bundleContext)
      });

      // Determine next nodes
      const nextConnections = adjacencyMap.get(node.id) || [];

      // Handle conditional branching
      if (
        node.type === NodeType.IF_ELSE ||
        node.type === NodeType.SWITCH ||
        node.type === NodeType.LOOP
      ) {
        const branchToFollow = bundleContext.branchToFollow as
          | string
          | undefined;

        if (branchToFollow) {
          for (const conn of nextConnections) {
            if (conn.fromOutput === branchToFollow) {
              reachableNodes.add(conn.toNodeId);
            }
          }
          delete bundleContext.branchToFollow;
        } else {
          // Fallback: use variable-based branch
          const nodeConfig = node.data as Record<string, unknown>;
          const variableName = nodeConfig.variableName as string;
          const branchResult = (
            bundleContext.variables as Record<string, any>
          )?.[variableName]?.branchToFollow;

          if (branchResult) {
            for (const conn of nextConnections) {
              if (conn.fromOutput === branchResult) {
                reachableNodes.add(conn.toNodeId);
              }
            }
          }
        }
      } else {
        // Regular nodes
        for (const conn of nextConnections) {
          reachableNodes.add(conn.toNodeId);
        }
      }
    }

    // Extract bundle outputs based on bundleOutputs definition
    const bundleOutputDefinitions = bundleWorkflow.bundleOutputs as
      | Array<{ name: string; variablePath: string }>
      | undefined;

    const bundleOutputs: Record<string, unknown> = {};

    if (bundleOutputDefinitions) {
      for (const outputDef of bundleOutputDefinitions) {
        const value = getNestedValue(
          bundleContext.variables as Record<string, unknown>,
          outputDef.variablePath
        );
        bundleOutputs[outputDef.name] = value;
      }
    } else {
      // If no outputs defined, return entire context
      bundleOutputs.result = bundleContext;
    }

    // Merge bundle outputs back into parent context
    const newContext = {
      ...context,
      variables: {
        ...(typeof context.variables === "object" && context.variables !== null
          ? context.variables
          : {}),
        [config.variableName]: bundleOutputs,
      },
    };

    // Publish success status
    await step.run(`bundle-workflow-${nodeId}-publish-success`, async () => {
      await publish(
        bundleWorkflowChannel().status({ nodeId, status: "success" })
      );
    });

    return newContext;
  } catch (error) {
    // Publish error status
    await step.run(`bundle-workflow-${nodeId}-publish-error`, async () => {
      await publish(
        bundleWorkflowChannel().status({ nodeId, status: "error" })
      );
    });
    throw error;
  }
};
