import type { FormFieldType } from "@/db/enums";
import type { FormEditorField } from "@/features/forms-builder/components/form-editor-types";

export type FormFieldDraft = {
  type: FormFieldType;
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  optionsText: string;
  defaultValue: string;
  min: string;
  max: string;
  step: string;
};

export type FormFieldUpdate = {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  options: string[];
  defaultValue: string;
  validation: Record<string, number>;
};

export function formFieldDraft(field: FormEditorField): FormFieldDraft {
  const validation = numericRecord(field.validation);
  return {
    type: field.type,
    label: field.label,
    placeholder: field.placeholder ?? "",
    helpText: field.helpText ?? "",
    required: field.required,
    optionsText: stringOptions(field.options).join("\n"),
    defaultValue: field.defaultValue ?? "",
    min: numberString(validation.min),
    max: numberString(validation.max),
    step: numberString(validation.step),
  };
}

export function formFieldUpdate(
  id: string,
  draft: FormFieldDraft,
): FormFieldUpdate {
  const options = [
    ...new Set(
      draft.optionsText
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  const validation = Object.fromEntries(
    [
      ["min", optionalNumber(draft.min)],
      ["max", optionalNumber(draft.max)],
      ["step", optionalNumber(draft.step)],
    ].filter((entry): entry is [string, number] => entry[1] !== undefined),
  );
  return {
    id,
    type: draft.type,
    label: draft.label.trim(),
    placeholder: draft.placeholder.trim(),
    helpText: draft.helpText.trim(),
    required: draft.required,
    options,
    defaultValue: draft.defaultValue,
    validation,
  };
}

function numericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
}

function stringOptions(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((option): option is string => typeof option === "string")
    : [];
}

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberString(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}
