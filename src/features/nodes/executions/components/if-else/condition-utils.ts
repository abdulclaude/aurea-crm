import type { WorkflowContext } from "@/features/executions/types";

import {
  humanizeOperand,
  normalizeIfElseConfig,
  type IfElseCondition,
  type IfElseFormValues,
  type IfElseOperator,
  type IfElseValueType,
} from "./schema";

const OPERATOR_LABELS: Record<IfElseOperator, string> = {
  equals: "is exactly",
  notEquals: "is not",
  greaterThan: "is greater than",
  lessThan: "is less than",
  greaterThanOrEqual: "is at least",
  lessThanOrEqual: "is at most",
  contains: "contains",
  notContains: "does not contain",
  startsWith: "starts with",
  endsWith: "ends with",
  isEmpty: "is empty",
  isNotEmpty: "is not empty",
};

export type IfElseEvaluation = {
  result: boolean;
  conditionResults: Array<{
    id: string;
    result: boolean;
    leftValue: unknown;
    rightValue: unknown;
  }>;
};

export function describeIfElseConfig(input: unknown): string {
  try {
    const config = normalizeIfElseConfig(input);
    const first = config.conditions[0];
    if (!first?.leftOperand) return "Choose what this condition should check";

    const summary = describeCondition(first);
    const remaining = config.conditions.length - 1;
    if (remaining === 0) return summary;
    return `${summary} ${config.matchMode === "all" ? "and" : "or"} ${remaining} more`;
  } catch {
    return "Choose what this condition should check";
  }
}

export function describeCondition(condition: IfElseCondition): string {
  const left = condition.leftLabel || humanizeOperand(condition.leftOperand);
  const operator = OPERATOR_LABELS[condition.operator];
  if (["isEmpty", "isNotEmpty"].includes(condition.operator)) {
    return `${left} ${operator}`;
  }
  const right =
    condition.rightLabel ||
    (condition.rightOperandSource === "field"
      ? humanizeOperand(condition.rightOperand || "value")
      : condition.rightOperand || "a value");
  return `${left} ${operator} ${right}`;
}

export function evaluateIfElseConfig(
  input: unknown,
  context: WorkflowContext,
): IfElseEvaluation {
  const config = normalizeIfElseConfig(input);
  const conditionResults = config.conditions.map((condition) => {
    const left = resolveOperand(condition.leftOperand, context);
    const right = ["isEmpty", "isNotEmpty"].includes(condition.operator)
      ? { found: true, value: undefined }
      : resolveOperand(condition.rightOperand || "", context);

    return {
      id: condition.id,
      result:
        left.found &&
        right.found &&
        compareValues(
          left.value,
          right.value,
          condition.operator,
          condition.valueType,
        ),
      leftValue: left.value,
      rightValue: right.value,
    };
  });

  return {
    result:
      config.matchMode === "all"
        ? conditionResults.every((condition) => condition.result)
        : conditionResults.some((condition) => condition.result),
    conditionResults,
  };
}

export function operatorLabel(operator: IfElseOperator): string {
  return OPERATOR_LABELS[operator];
}

export function operatorsForType(
  valueType: IfElseValueType,
): IfElseOperator[] {
  if (valueType === "number" || valueType === "date") {
    return [
      "equals",
      "notEquals",
      "greaterThan",
      "lessThan",
      "greaterThanOrEqual",
      "lessThanOrEqual",
      "isEmpty",
      "isNotEmpty",
    ];
  }
  if (valueType === "boolean") return ["equals", "notEquals"];
  return [
    "equals",
    "notEquals",
    "contains",
    "notContains",
    "startsWith",
    "endsWith",
    "isEmpty",
    "isNotEmpty",
  ];
}

function resolveOperand(
  operand: string,
  context: WorkflowContext,
): { found: boolean; value: unknown } {
  const exactVariable = operand.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
  if (exactVariable) {
    return resolvePath(exactVariable[1] || "", context);
  }

  const variables = operand.match(/\{\{\s*([^{}]+?)\s*\}\}/g);
  if (!variables) return { found: true, value: operand };

  let compiled = operand;
  for (const token of variables) {
    const path = token.replace(/^\{\{|\}\}$/g, "").trim();
    const resolved = resolvePath(path, context);
    if (!resolved.found) return { found: false, value: undefined };
    compiled = compiled.replace(token, String(resolved.value ?? ""));
  }
  return { found: true, value: compiled };
}

function resolvePath(
  path: string,
  context: WorkflowContext,
): { found: boolean; value: unknown } {
  const variables = isRecord(context.variables) ? context.variables : {};
  const variableValue = getNestedValue(variables, path);
  if (variableValue.found) return variableValue;
  return getNestedValue(context, path);
}

function getNestedValue(
  object: Record<string, unknown>,
  path: string,
): { found: boolean; value: unknown } {
  let current: unknown = object;
  for (const key of path.split(".")) {
    if (!isRecord(current) || !(key in current)) {
      return { found: false, value: undefined };
    }
    current = current[key];
  }
  return { found: true, value: current };
}

function compareValues(
  left: unknown,
  right: unknown,
  operator: IfElseOperator,
  valueType: IfElseValueType,
): boolean {
  if (operator === "isEmpty") return isEmpty(left);
  if (operator === "isNotEmpty") return !isEmpty(left);

  const normalized = normalizeComparisonValues(left, right, valueType);
  if (!normalized) return false;

  const [leftValue, rightValue] = normalized;
  switch (operator) {
    case "equals":
      return leftValue === rightValue;
    case "notEquals":
      return leftValue !== rightValue;
    case "greaterThan":
      return leftValue > rightValue;
    case "lessThan":
      return leftValue < rightValue;
    case "greaterThanOrEqual":
      return leftValue >= rightValue;
    case "lessThanOrEqual":
      return leftValue <= rightValue;
    case "contains":
      return Array.isArray(left)
        ? left.some((value) => String(value) === String(right))
        : String(leftValue).includes(String(rightValue));
    case "notContains":
      return Array.isArray(left)
        ? !left.some((value) => String(value) === String(right))
        : !String(leftValue).includes(String(rightValue));
    case "startsWith":
      return String(leftValue).startsWith(String(rightValue));
    case "endsWith":
      return String(leftValue).endsWith(String(rightValue));
  }
}

function normalizeComparisonValues(
  left: unknown,
  right: unknown,
  valueType: IfElseValueType,
): [string | number | boolean, string | number | boolean] | null {
  if (valueType === "number") {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    return Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
      ? [leftNumber, rightNumber]
      : null;
  }
  if (valueType === "date") {
    const leftDate = new Date(String(left)).getTime();
    const rightDate = new Date(String(right)).getTime();
    return Number.isFinite(leftDate) && Number.isFinite(rightDate)
      ? [leftDate, rightDate]
      : null;
  }
  if (valueType === "boolean") {
    const leftBoolean = toBoolean(left);
    const rightBoolean = toBoolean(right);
    return leftBoolean !== null && rightBoolean !== null
      ? [leftBoolean, rightBoolean]
      : null;
  }
  return [String(left ?? ""), String(right ?? "")];
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (isRecord(value)) return Object.keys(value).length === 0;
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
