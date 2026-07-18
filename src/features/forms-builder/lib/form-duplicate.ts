import {
  DEFAULT_FORM_CRM_RESOLUTION_CONFIG,
  formCrmResolutionConfigSchema,
  type FormCrmResolutionConfig,
} from "@/features/forms-builder/lib/form-crm-resolution";

export function remapFormCrmResolutionConfig(
  value: unknown,
  fieldIds: ReadonlyMap<string, string>,
): FormCrmResolutionConfig {
  const parsed = formCrmResolutionConfigSchema.safeParse(value);
  if (!parsed.success) return DEFAULT_FORM_CRM_RESOLUTION_CONFIG;
  const map = (fieldId: string | null): string | null =>
    fieldId ? (fieldIds.get(fieldId) ?? null) : null;
  const remapped = {
    ...parsed.data,
    emailFieldId: map(parsed.data.emailFieldId),
    phoneFieldId: map(parsed.data.phoneFieldId),
    fullNameFieldId: map(parsed.data.fullNameFieldId),
    firstNameFieldId: map(parsed.data.firstNameFieldId),
    lastNameFieldId: map(parsed.data.lastNameFieldId),
  };
  const validated = formCrmResolutionConfigSchema.safeParse(remapped);
  return validated.success ? validated.data : DEFAULT_FORM_CRM_RESOLUTION_CONFIG;
}
