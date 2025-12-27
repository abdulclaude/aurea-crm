import type { NodeExecutor } from "@/features/executions/types";
import type { StopWorkflowFormValues } from "./dialog";
import { stopWorkflowChannel } from "@/inngest/channels/stop-workflow";

export const stopWorkflowExecutor: NodeExecutor = async (params) => {
  const { data, context, nodeId, publish } = params;
  const config = data as StopWorkflowFormValues;

  await publish(stopWorkflowChannel().status({ nodeId, status: "loading" }));

  // Resolve variables in reason if provided
  let resolvedReason = config.reason || "Workflow stopped";
  if (resolvedReason) {
    const matches = resolvedReason.match(/\{\{(.+?)\}\}/g);
    if (matches) {
      for (const match of matches) {
        const path = match.slice(2, -2).trim();
        let value = getNestedValue(context.variables as Record<string, unknown>, path);
        if (value === undefined) {
          value = getNestedValue(context, path);
        }
        resolvedReason = resolvedReason.replace(match, String(value ?? ""));
      }
    }
  }

  // Store stop information in context
  const newContext = {
    ...context,
    variables: {
      ...(context.variables || {}),
      [config.variableName]: {
        stopped: true,
        reason: resolvedReason,
        timestamp: new Date().toISOString(),
      },
    },
    // Set a flag to stop workflow execution
    shouldStop: true,
  };

  await publish(stopWorkflowChannel().status({ nodeId, status: "success" }));

  return newContext;
};

// Helper function to get nested values from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}
