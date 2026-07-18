import type { CustomerFieldDefinitionValues } from "../contracts";

export function normalizeCustomerFieldDefinition(
  values: CustomerFieldDefinitionValues,
): CustomerFieldDefinitionValues {
  return {
    ...values,
    key: values.key.trim().toLowerCase(),
    label: values.label.trim(),
    description: values.description?.trim() || null,
    options: values.options.map((option) => option.trim()),
  };
}

export function fieldTypeUsesOptions(
  fieldType: CustomerFieldDefinitionValues["fieldType"],
): boolean {
  return fieldType === "SELECT" || fieldType === "MULTI_SELECT";
}
