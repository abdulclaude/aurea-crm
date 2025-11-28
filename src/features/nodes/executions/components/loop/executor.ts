import type { NodeExecutor } from "@/features/executions/types";
import type { LoopFormValues } from "./dialog";

export const loopExecutor: NodeExecutor = async (params) => {
  const { data, context, nodeId } = params;
  const config = data as LoopFormValues;

  // Initialize loop state if not present
  if (!context.loopState) {
    context.loopState = {};
  }

  const loopState = context.loopState as Record<string, any>;
  const nodeLoopKey = `loop_${nodeId}`;

  // Check if this loop is already initialized
  if (!loopState[nodeLoopKey]) {
    // First execution - initialize loop
    let items: unknown[] = [];
    let totalIterations = 0;

    if (config.loopType === "array") {
      // Get array from variable
      let arrayInput = config.arrayInput || "";
      const matches = arrayInput.match(/\{\{(.+?)\}\}/g);
      if (matches) {
        for (const match of matches) {
          const path = match.slice(2, -2).trim();
          let value = getNestedValue(context.variables as Record<string, unknown>, path);
          if (value === undefined) {
            value = getNestedValue(context, path);
          }
          arrayInput = String(value ?? "");
        }
      }

      // Try to parse as JSON array or use the resolved value
      try {
        items = JSON.parse(arrayInput);
        if (!Array.isArray(items)) {
          items = [items];
        }
      } catch {
        // If not JSON, check if it's already an array in variables or root context
        let resolvedValue = getNestedValue(context.variables as Record<string, unknown>, arrayInput);
        if (resolvedValue === undefined) {
          resolvedValue = getNestedValue(context, arrayInput);
        }
        if (Array.isArray(resolvedValue)) {
          items = resolvedValue;
        } else {
          items = [];
        }
      }

      totalIterations = items.length;
    } else {
      // Count-based loop
      let countInput = config.countInput || "0";
      const matches = countInput.match(/\{\{(.+?)\}\}/g);
      if (matches) {
        for (const match of matches) {
          const path = match.slice(2, -2).trim();
          const value = getNestedValue(context.variables as Record<string, unknown>, path);
          countInput = String(value ?? "0");
        }
      }

      totalIterations = Number.parseInt(countInput, 10) || 0;
      items = Array.from({ length: totalIterations }, (_, i) => i);
    }

    // Initialize loop state
    loopState[nodeLoopKey] = {
      items,
      currentIndex: 0,
      totalIterations,
      isFirstIteration: true,
    };
  }

  const currentLoopState = loopState[nodeLoopKey];
  const { items, currentIndex, totalIterations } = currentLoopState;

  // Check if loop is complete
  if (currentIndex >= totalIterations) {
    // Clean up loop state
    delete loopState[nodeLoopKey];

    // Store final result
    const newContext = {
      ...context,
      variables: {
        ...(context.variables || {}),
        [config.variableName]: {
          completed: true,
          totalIterations,
          items,
        },
      },
      loopState,
      // Signal to take the "after-loop" branch
      branchToFollow: "after-loop",
    };

    return newContext;
  }

  // Set current item and index variables
  const currentItem = items[currentIndex];
  const updatedVariables: Record<string, unknown> = {
    ...(context.variables || {}),
    [config.itemVariableName]: currentItem,
  };

  if (config.indexVariableName) {
    updatedVariables[config.indexVariableName] = currentIndex;
  }

  // Increment index for next iteration
  currentLoopState.currentIndex += 1;
  currentLoopState.isFirstIteration = false;

  // Store loop progress
  const newContext = {
    ...context,
    variables: {
      ...updatedVariables,
      [config.variableName]: {
        currentIndex,
        totalIterations,
        isComplete: false,
      },
    },
    loopState,
    // Signal to take the "loop-body" branch
    branchToFollow: "loop-body",
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
