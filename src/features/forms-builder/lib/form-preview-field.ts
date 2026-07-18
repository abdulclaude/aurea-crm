import type { FormEditorField } from "@/features/forms-builder/components/form-editor-types";
import {
  publicFormFieldSchema,
  type PublicFormField,
} from "@/features/forms-builder/lib/public-form-contract";

export function buildPreviewField(
  field: FormEditorField,
): PublicFormField | null {
  const options = Array.isArray(field.options)
    ? field.options.filter(
        (option): option is string => typeof option === "string",
      )
    : [];
  const choiceType = ["SELECT", "RADIO", "MULTI_SELECT"].includes(field.type);
  const parsed = publicFormFieldSchema.safeParse({
    id: field.id,
    type: field.type,
    label: field.label,
    placeholder: field.placeholder,
    helpText: field.helpText,
    required: field.required,
    validation: field.validation ?? {},
    options:
      choiceType && options.length === 0
        ? ["Option 1", "Option 2"]
        : options,
    defaultValue: field.defaultValue,
    order: field.order,
  });
  return parsed.success ? parsed.data : null;
}
