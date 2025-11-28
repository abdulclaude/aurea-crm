import type { NodeExecutor } from "@/features/executions/types";
import type { IfElseFormValues } from "./dialog";

export const ifElseExecutor: NodeExecutor = async (params) => {
  const { data, context } = params;
  const config = data as IfElseFormValues;

  // Resolve variables in left operand
  let leftValue = config.leftOperand;
  const leftMatch = leftValue.match(/\{\{(.+?)\}\}/g);

  if (leftMatch) {
    for (const match of leftMatch) {
      const path = match.slice(2, -2).trim();

      // Try to get value from context.variables first, then fall back to root context
      let value = getNestedValue(
        context.variables as Record<string, unknown>,
        path
      );

      if (value === undefined) {
        value = getNestedValue(context, path);
      }

      const replacementValue = String(value ?? "");
      leftValue = leftValue.replace(match, replacementValue);
    }
  }

  // Resolve variables in right operand if needed
  let rightValue = config.rightOperand || "";
  if (rightValue) {
    const rightMatch = rightValue.match(/\{\{(.+?)\}\}/g);
    if (rightMatch) {
      for (const match of rightMatch) {
        const path = match.slice(2, -2).trim();
        // Try to get value from context.variables first, then fall back to root context
        let value = getNestedValue(
          context.variables as Record<string, unknown>,
          path
        );
        if (value === undefined) {
          value = getNestedValue(context, path);
        }
        rightValue = rightValue.replace(match, String(value ?? ""));
      }
    }
  }

  // Perform the comparison
  let result = false;

  switch (config.operator) {
    case "equals":
      result = leftValue === rightValue;
      break;
    case "notEquals":
      result = leftValue !== rightValue;
      break;
    case "greaterThan":
      result = Number(leftValue) > Number(rightValue);
      break;
    case "lessThan":
      result = Number(leftValue) < Number(rightValue);
      break;
    case "greaterThanOrEqual":
      result = Number(leftValue) >= Number(rightValue);
      break;
    case "lessThanOrEqual":
      result = Number(leftValue) <= Number(rightValue);
      break;
    case "contains":
      result = leftValue.includes(rightValue);
      break;
    case "notContains":
      result = !leftValue.includes(rightValue);
      break;
    case "startsWith":
      result = leftValue.startsWith(rightValue);
      break;
    case "endsWith":
      result = leftValue.endsWith(rightValue);
      break;
    case "isEmpty":
      result = !leftValue || leftValue.trim() === "";
      break;
    case "isNotEmpty":
      result = !!leftValue && leftValue.trim() !== "";
      break;
  }

  // Store result in context
  const newContext = {
    ...context,
    variables: {
      ...(context.variables || {}),
      [config.variableName]: {
        result,
        leftValue,
        rightValue,
        operator: config.operator,
        // Store which branch should be taken
        // The workflow engine can use this to follow edges with matching sourceHandle
        // Edges from this node will have sourceHandle: "true" or sourceHandle: "false"
        branchToFollow: result ? "true" : "false",
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
