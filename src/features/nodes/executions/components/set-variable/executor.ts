import type { NodeExecutor } from "@/features/executions/types";
import type { SetVariableFormValues } from "./dialog";

export const setVariableExecutor: NodeExecutor = async (params) => {
  const { data, context } = params;
  const config = data as SetVariableFormValues;

  // Resolve variables in the value
  let resolvedValue = config.value;
  const matches = resolvedValue.match(/\{\{(.+?)\}\}/g);

  if (matches) {
    for (const match of matches) {
      const path = match.slice(2, -2).trim();

      // Check if it's a JSON stringify request
      if (path.startsWith("json ")) {
        const varPath = path.slice(5).trim();
        let value = getNestedValue(context.variables as Record<string, unknown>, varPath);
        if (value === undefined) {
          value = getNestedValue(context, varPath);
        }
        resolvedValue = resolvedValue.replace(
          match,
          JSON.stringify(value ?? null)
        );
      } else {
        let value = getNestedValue(context.variables as Record<string, unknown>, path);
        if (value === undefined) {
          value = getNestedValue(context, path);
        }
        resolvedValue = resolvedValue.replace(match, String(value ?? ""));
      }
    }
  }

  // Try to parse as JSON if it looks like JSON
  let finalValue: unknown = resolvedValue;
  if (
    (resolvedValue.startsWith("{") && resolvedValue.endsWith("}")) ||
    (resolvedValue.startsWith("[") && resolvedValue.endsWith("]"))
  ) {
    try {
      finalValue = JSON.parse(resolvedValue);
    } catch {
      // If parsing fails, keep as string
      finalValue = resolvedValue;
    }
  } else if (!Number.isNaN(Number(resolvedValue)) && resolvedValue.trim() !== "") {
    // Try to parse as number
    finalValue = Number(resolvedValue);
  } else if (resolvedValue === "true" || resolvedValue === "false") {
    // Parse boolean
    finalValue = resolvedValue === "true";
  }

  // Store the variable in context
  const newContext = {
    ...context,
    variables: {
      ...(context.variables || {}),
      [config.variableName]: finalValue,
    },
  };

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
