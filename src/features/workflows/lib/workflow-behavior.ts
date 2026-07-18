import { z } from "zod";

export const workflowBehaviorConfigSchema = z
  .object({
    enrollment: z.enum(["EVERY_EVENT", "ONCE_PER_MEMBER"]),
  })
  .strict();

export type WorkflowBehaviorConfig = z.infer<
  typeof workflowBehaviorConfigSchema
>;

export const DEFAULT_WORKFLOW_BEHAVIOR: WorkflowBehaviorConfig = {
  enrollment: "EVERY_EVENT",
};

export function parseWorkflowBehavior(value: unknown): WorkflowBehaviorConfig {
  const parsed = workflowBehaviorConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_WORKFLOW_BEHAVIOR;
}

export function workflowEnrollmentClientId(
  initialData: unknown,
): string | null {
  const context = record(initialData);
  const triggerData = record(context?.triggerData);
  const nestedClient = record(triggerData?.client);
  return stringValue(triggerData?.clientId) ?? stringValue(nestedClient?.id);
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
