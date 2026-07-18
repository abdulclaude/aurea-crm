import { z } from "zod";

const optionalFieldId = z.string().min(1).max(128).nullable().default(null);

export const formCrmResolutionConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    matchBy: z.enum(["EMAIL", "EMAIL_OR_PHONE"]).default("EMAIL"),
    createIfMissing: z.boolean().default(true),
    updateExisting: z.enum(["NEVER", "FILL_EMPTY"]).default("FILL_EMPTY"),
    emailFieldId: optionalFieldId,
    phoneFieldId: optionalFieldId,
    fullNameFieldId: optionalFieldId,
    firstNameFieldId: optionalFieldId,
    lastNameFieldId: optionalFieldId,
  })
  .strict()
  .superRefine((config, context) => {
    if (!config.enabled) return;
    if (!config.emailFieldId && config.matchBy === "EMAIL") {
      context.addIssue({
        code: "custom",
        path: ["emailFieldId"],
        message: "Choose an email field.",
      });
    }
    if (!config.emailFieldId && !config.phoneFieldId) {
      context.addIssue({
        code: "custom",
        message: "Choose an email or phone field.",
      });
    }
    if (
      config.createIfMissing &&
      !config.fullNameFieldId &&
      !config.firstNameFieldId &&
      !config.lastNameFieldId
    ) {
      context.addIssue({
        code: "custom",
        message: "Choose a name field before creating members.",
      });
    }
  });

export type FormCrmResolutionConfig = z.infer<
  typeof formCrmResolutionConfigSchema
>;

export const DEFAULT_FORM_CRM_RESOLUTION_CONFIG: FormCrmResolutionConfig = {
  enabled: false,
  matchBy: "EMAIL",
  createIfMissing: true,
  updateExisting: "FILL_EMPTY",
  emailFieldId: null,
  phoneFieldId: null,
  fullNameFieldId: null,
  firstNameFieldId: null,
  lastNameFieldId: null,
};

export function parseFormCrmResolutionConfig(
  value: unknown,
): FormCrmResolutionConfig {
  return formCrmResolutionConfigSchema.parse(
    value ?? DEFAULT_FORM_CRM_RESOLUTION_CONFIG,
  );
}

export function formCrmResolutionIsEnabled(value: unknown): boolean {
  const parsed = formCrmResolutionConfigSchema.safeParse(value);
  return parsed.success && parsed.data.enabled;
}
