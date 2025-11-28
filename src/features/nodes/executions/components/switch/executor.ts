import type { NodeExecutor } from "@/features/executions/types";
import type { SwitchFormValues } from "./dialog";

export const switchExecutor: NodeExecutor = async (params) => {
  const { data, context } = params;
  const config = data as SwitchFormValues;

  // Resolve variables in input value
  let inputValue = config.inputValue;
  const matches = inputValue.match(/\{\{(.+?)\}\}/g);
  if (matches) {
    for (const match of matches) {
      const path = match.slice(2, -2).trim();
      let value = getNestedValue(context.variables as Record<string, unknown>, path);
      if (value === undefined) {
        value = getNestedValue(context, path);
      }
      inputValue = inputValue.replace(match, String(value ?? ""));
    }
  }

  // Find matching case
  let matchedBranch = "default";
  let matchedIndex = -1;

  for (let i = 0; i < config.cases.length; i++) {
    const caseItem = config.cases[i];
    if (inputValue === caseItem.value) {
      matchedBranch = `case-${i}`;
      matchedIndex = i;
      break;
    }
  }

  // Store result in context
  const newContext = {
    ...context,
    variables: {
      ...(context.variables || {}),
      [config.variableName]: {
        inputValue,
        matchedBranch,
        matchedIndex,
        matchedValue: matchedIndex >= 0 ? config.cases[matchedIndex].value : null,
        // The workflow engine will use this to follow the correct edge
        branchToFollow: matchedBranch,
      },
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
