import { z } from "zod";

const variableNameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/)
  .optional();

export const formSubmittedTriggerConfigSchema = z
  .object({
    formId: z.string().trim().min(1).nullable().optional(),
    intent: z.enum(["FORM", "NEWSLETTER"]).optional(),
    requireEmailMarketingConsent: z.boolean().default(false),
    requireSmsMarketingConsent: z.boolean().default(false),
    variableName: variableNameSchema,
  })
  .superRefine((value, context) => {
    if (value.intent === "NEWSLETTER" && !value.formId) {
      context.addIssue({
        code: "custom",
        message: "Choose the newsletter form.",
        path: ["formId"],
      });
    }
  });

export const pricingOptionPurchasedTriggerConfigSchema = z.object({
  pricingOptionIds: z.array(z.string().trim().min(1)).default([]),
  variableName: variableNameSchema,
});

export const inactivityActivityDimensionSchema = z.enum([
  "CRM_INTERACTION",
  "CLASS_BOOKING",
  "CLASS_ATTENDANCE",
  "SUCCESSFUL_PAYMENT",
]);

export const clientInactivityTriggerConfigSchema = z.object({
  days: z.number().int().min(1).max(3650).default(30),
  activityDimensions: z
    .array(inactivityActivityDimensionSchema)
    .min(1)
    .default(["CRM_INTERACTION", "CLASS_ATTENDANCE"]),
  variableName: variableNameSchema,
});

export type FormSubmittedTriggerConfig = z.infer<
  typeof formSubmittedTriggerConfigSchema
>;
export type PricingOptionPurchasedTriggerConfig = z.infer<
  typeof pricingOptionPurchasedTriggerConfigSchema
>;
export type ClientInactivityTriggerConfig = z.infer<
  typeof clientInactivityTriggerConfigSchema
>;

export function formSubmissionTriggerMatches(
  data: unknown,
  event: {
    formId: string;
    emailMarketingConsent: boolean;
    smsMarketingConsent: boolean;
  },
): boolean {
  const parsed = formSubmittedTriggerConfigSchema.safeParse(data);
  if (!parsed.success) return false;

  return Boolean(
    triggerConfigMatchesOptionalId(parsed.data.formId, event.formId) &&
      (!parsed.data.requireEmailMarketingConsent ||
        event.emailMarketingConsent) &&
      (!parsed.data.requireSmsMarketingConsent || event.smsMarketingConsent),
  );
}

export function triggerConfigMatchesOptionalId(
  configuredId: string | null | undefined,
  actualId: string,
): boolean {
  return !configuredId || configuredId === actualId;
}

export function pricingOptionTriggerMatches(
  configuredIds: readonly string[],
  pricingOptionId: string,
): boolean {
  return configuredIds.length === 0 || configuredIds.includes(pricingOptionId);
}

export function inactivityOccurrenceKey(input: {
  nodeId: string;
  clientId: string;
  days: number;
  activityDimensions: readonly string[];
  lastActivityAt: Date;
}): string {
  return [
    "client-inactivity",
    input.nodeId,
    input.clientId,
    input.days,
    [...input.activityDimensions].sort().join(","),
    input.lastActivityAt.toISOString(),
  ].join(":");
}
