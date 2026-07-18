import { z } from "zod";

export const ifElseOperatorSchema = z.enum([
  "equals",
  "notEquals",
  "greaterThan",
  "lessThan",
  "greaterThanOrEqual",
  "lessThanOrEqual",
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
]);

export const ifElseValueTypeSchema = z.enum([
  "text",
  "number",
  "boolean",
  "date",
]);

export const ifElseConditionSchema = z.object({
  id: z.string().min(1),
  leftOperand: z.string().min(1, "Choose a field to check."),
  leftLabel: z.string().optional(),
  operator: ifElseOperatorSchema,
  rightOperand: z.string().optional(),
  rightLabel: z.string().optional(),
  rightOperandSource: z.enum(["value", "field"]),
  valueType: ifElseValueTypeSchema,
});

export const ifElseFormSchema = z
  .object({
    version: z.literal(2),
    actionName: z.string().trim().min(1, "Give this condition a name.").max(80),
    variableName: z
      .string()
      .min(1, "Result variable is required.")
      .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
        message:
          "Result variable must start with a letter or underscore and contain only letters, numbers, and underscores.",
      }),
    clientId: z.string().trim().optional(),
    matchMode: z.enum(["all", "any"]),
    conditions: z.array(ifElseConditionSchema).min(1).max(10),
  })
  .superRefine((value, context) => {
    value.conditions.forEach((condition, index) => {
      if (
        !["isEmpty", "isNotEmpty"].includes(condition.operator) &&
        !condition.rightOperand?.trim()
      ) {
        context.addIssue({
          code: "custom",
          message: "Enter or select a comparison value.",
          path: ["conditions", index, "rightOperand"],
        });
      }
    });
  });

const legacyIfElseSchema = z.object({
  actionName: z.string().optional(),
  variableName: z.string().default("condition"),
  clientId: z.string().trim().optional(),
  leftOperand: z.string().min(1),
  operator: ifElseOperatorSchema,
  rightOperand: z.string().optional(),
});

export type IfElseFormValues = z.infer<typeof ifElseFormSchema>;
export type IfElseCondition = z.infer<typeof ifElseConditionSchema>;
export type IfElseOperator = z.infer<typeof ifElseOperatorSchema>;
export type IfElseValueType = z.infer<typeof ifElseValueTypeSchema>;

export function createIfElseCondition(
  overrides: Partial<IfElseCondition> = {},
): IfElseCondition {
  return {
    id: overrides.id ?? createConditionId(),
    leftOperand: overrides.leftOperand ?? "",
    leftLabel: overrides.leftLabel,
    operator: overrides.operator ?? "equals",
    rightOperand: overrides.rightOperand ?? "",
    rightLabel: overrides.rightLabel,
    rightOperandSource: overrides.rightOperandSource ?? "value",
    valueType: overrides.valueType ?? "text",
  };
}

export function normalizeIfElseConfig(input: unknown): IfElseFormValues {
  const current = ifElseFormSchema.safeParse(input);
  if (current.success) return current.data;

  const legacy = legacyIfElseSchema.parse(input);
  return {
    version: 2,
    actionName: legacy.actionName?.trim() || "Check a condition",
    variableName: legacy.variableName,
    clientId: legacy.clientId,
    matchMode: "all",
    conditions: [
      createIfElseCondition({
        id: "legacy-condition",
        leftOperand: legacy.leftOperand,
        leftLabel: humanizeOperand(legacy.leftOperand),
        operator: legacy.operator,
        rightOperand: legacy.rightOperand,
        rightOperandSource: "value",
        valueType: inferValueType(legacy.leftOperand),
      }),
    ],
  };
}

export function inferValueType(operand: string): IfElseValueType {
  const normalized = operand.toLowerCase();
  if (/count|amount|total|days|credits|points|score|streak/.test(normalized)) {
    return "number";
  }
  if (/date|time|at\}\}|birthday|expires|expiring/.test(normalized)) {
    return "date";
  }
  if (/\.is[A-Z_]|\.has[A-Z_]|success|active|cancelled|canceled/.test(operand)) {
    return "boolean";
  }
  return "text";
}

export function humanizeOperand(operand: string): string {
  const path = operand.replace(/^\{\{|\}\}$/g, "").trim();
  const segment = path.split(".").at(-1) || path;
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function createConditionId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `condition-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
