import type {
  PublicFormField,
  PublishedFormSource,
} from "@/features/forms-builder/lib/public-form-contract";

export type PublicFormValidationResult = {
  success: boolean;
  fieldErrors: Record<string, string>;
  formErrors: string[];
};

export function validatePublicFormValues(
  source: PublishedFormSource,
  values: Record<string, unknown>,
): PublicFormValidationResult {
  const fieldErrors: Record<string, string> = {};
  const knownFieldIds = new Set(
    source.steps.flatMap((step) => step.fields.map((field) => field.id)),
  );
  const formErrors = Object.keys(values).some(
    (fieldId) => !knownFieldIds.has(fieldId),
  )
    ? ["The submission contains fields outside this published definition."]
    : [];
  for (const step of source.steps) {
    for (const field of step.fields) {
      const error = validateFieldValue(field, values[field.id]);
      if (error) fieldErrors[field.id] = error;
    }
  }
  return {
    success: Object.keys(fieldErrors).length === 0 && formErrors.length === 0,
    fieldErrors,
    formErrors,
  };
}

export function validatePublicFormFields(
  fields: readonly PublicFormField[],
  values: Record<string, unknown>,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const field of fields) {
    const error = validateFieldValue(field, values[field.id]);
    if (error) fieldErrors[field.id] = error;
  }
  return fieldErrors;
}

function validateFieldValue(
  field: PublicFormField,
  rawValue: unknown,
): string | null {
  if (field.type === "CHECKBOX") {
    if (rawValue === undefined) {
      return field.required ? `${field.label} is required.` : null;
    }
    if (typeof rawValue !== "boolean") {
      return `${field.label} contains an invalid value.`;
    }
    return field.required && !rawValue ? `${field.label} is required.` : null;
  }
  if (field.type === "MULTI_SELECT") {
    if (rawValue === undefined) {
      return field.required ? `${field.label} is required.` : null;
    }
    if (!Array.isArray(rawValue)) {
      return `${field.label} contains an invalid value.`;
    }
    const selected = rawValue.filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    if (field.required && selected.length === 0) {
      return `${field.label} is required.`;
    }
    return selected.every((value) => field.options.includes(value))
      ? null
      : `${field.label} contains an invalid option.`;
  }
  if (rawValue === undefined) {
    return field.required ? `${field.label} is required.` : null;
  }
  if (typeof rawValue !== "string") {
    return `${field.label} contains an invalid value.`;
  }
  const value = rawValue.trim();
  if (!value) return field.required ? `${field.label} is required.` : null;
  if (value.length > 10_000) return `${field.label} is too long.`;

  if (
    field.validation.minLength !== undefined &&
    value.length < field.validation.minLength
  ) {
    return `${field.label} must contain at least ${field.validation.minLength} characters.`;
  }
  if (
    field.validation.maxLength !== undefined &&
    value.length > field.validation.maxLength
  ) {
    return `${field.label} must contain at most ${field.validation.maxLength} characters.`;
  }
  if (field.type === "EMAIL" && !/^\S+@\S+\.\S+$/.test(value)) {
    return `${field.label} must be a valid email address.`;
  }
  if (
    field.type === "PHONE" &&
    !/^[+0-9().\-\s]{7,32}$/.test(value)
  ) {
    return `${field.label} must be a valid phone number.`;
  }
  if (field.type === "URL") {
    try {
      const protocol = new URL(value).protocol;
      if (protocol !== "http:" && protocol !== "https:") throw new Error();
    } catch {
      return `${field.label} must be a valid HTTP or HTTPS URL.`;
    }
  }
  if (["SELECT", "RADIO"].includes(field.type)) {
    return field.options.includes(value)
      ? null
      : `${field.label} contains an invalid option.`;
  }
  if (["NUMBER", "RATING", "SLIDER"].includes(field.type)) {
    const number = Number(value);
    if (!Number.isFinite(number)) return `${field.label} must be a number.`;
    if (field.validation.min !== undefined && number < field.validation.min) {
      return `${field.label} must be at least ${field.validation.min}.`;
    }
    if (field.validation.max !== undefined && number > field.validation.max) {
      return `${field.label} must be at most ${field.validation.max}.`;
    }
  }
  if (field.type === "DATE" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${field.label} must be a valid date.`;
  }
  if (field.type === "TIME" && !/^\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    return `${field.label} must be a valid time.`;
  }
  if (
    field.type === "DATETIME" &&
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
  ) {
    return `${field.label} must be a valid date and time.`;
  }
  return null;
}
