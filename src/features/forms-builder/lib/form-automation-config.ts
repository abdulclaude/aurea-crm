import { z } from "zod";

const optionalFieldId = z.string().min(1).max(128).nullable().default(null);

export const formAutomationConfigSchema = z
  .object({
    version: z.literal(1).default(1),
    emailMarketingConsentFieldId: optionalFieldId,
    smsMarketingConsentFieldId: optionalFieldId,
    followUpConsentFieldId: optionalFieldId,
  })
  .strict();

export type FormAutomationConfig = z.infer<
  typeof formAutomationConfigSchema
>;

export const DEFAULT_FORM_AUTOMATION_CONFIG: FormAutomationConfig = {
  version: 1,
  emailMarketingConsentFieldId: null,
  smsMarketingConsentFieldId: null,
  followUpConsentFieldId: null,
};

export function parseFormAutomationConfig(
  value: unknown,
): FormAutomationConfig {
  return formAutomationConfigSchema.parse(
    value ?? DEFAULT_FORM_AUTOMATION_CONFIG,
  );
}

export function remapFormAutomationConfig(
  value: unknown,
  fieldIds: ReadonlyMap<string, string>,
): FormAutomationConfig {
  const parsed = formAutomationConfigSchema.safeParse(value);
  if (!parsed.success) return DEFAULT_FORM_AUTOMATION_CONFIG;
  const map = (fieldId: string | null): string | null =>
    fieldId ? (fieldIds.get(fieldId) ?? null) : null;

  return {
    version: 1,
    emailMarketingConsentFieldId: map(
      parsed.data.emailMarketingConsentFieldId,
    ),
    smsMarketingConsentFieldId: map(parsed.data.smsMarketingConsentFieldId),
    followUpConsentFieldId: map(parsed.data.followUpConsentFieldId),
  };
}

export function readFormAutomationConsent(input: {
  config: unknown;
  values: Readonly<Record<string, unknown>>;
}): { emailMarketing: boolean; smsMarketing: boolean; followUp: boolean } {
  const parsed = formAutomationConfigSchema.safeParse(input.config);
  if (!parsed.success) {
    return { emailMarketing: false, smsMarketing: false, followUp: false };
  }
  const isTrue = (fieldId: string | null): boolean =>
    fieldId !== null && input.values[fieldId] === true;
  return {
    emailMarketing: isTrue(parsed.data.emailMarketingConsentFieldId),
    smsMarketing: isTrue(parsed.data.smsMarketingConsentFieldId),
    followUp: isTrue(parsed.data.followUpConsentFieldId),
  };
}
