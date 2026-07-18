import { z } from "zod";
import { DEFAULT_FORM_AUTOMATION_CONFIG } from "@/features/forms-builder/lib/form-automation-config";

import {
  blockedPublicFormFieldTypeSchema,
  PUBLIC_FORM_DEFINITION_SCHEMA_VERSION,
  publicFormFieldSchema,
  publishedFormSourceSchema,
  type PublishedFormSource,
} from "@/features/forms-builder/lib/public-form-contract";
import { DEFAULT_FORM_THEME } from "@/features/forms-builder/lib/form-theme";
import {
  DEFAULT_FORM_PROGRESS_DISPLAY,
  formProgressDisplaySchema,
} from "@/features/forms-builder/lib/form-progress";

const draftFormSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isMultiStep: z.boolean(),
  showProgress: z.boolean(),
  progressDisplay: formProgressDisplaySchema.default(
    DEFAULT_FORM_PROGRESS_DISPLAY,
  ),
  successMessage: z.string(),
  redirectUrl: z.string().nullable(),
  workflowId: z.string().nullable().default(null),
  crmResolutionConfig: z.unknown().default({ enabled: false }),
  automationConfig: z.unknown().default(DEFAULT_FORM_AUTOMATION_CONFIG),
  primaryColor: z.string().default(DEFAULT_FORM_THEME.primaryColor),
  buttonTextColor: z.string().default(DEFAULT_FORM_THEME.buttonTextColor),
  backgroundColor: z.string().default(DEFAULT_FORM_THEME.backgroundColor),
  textColor: z.string().default(DEFAULT_FORM_THEME.textColor),
  locationId: z.string().nullable(),
  updatedAt: z.union([z.date(), z.string().datetime()]),
});

const draftStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int(),
  showConditions: z.unknown().nullable(),
});

const draftFieldSchema = z.object({
  id: z.string(),
  stepId: z.string(),
  type: z.string(),
  label: z.string(),
  placeholder: z.string().nullable(),
  helpText: z.string().nullable(),
  required: z.boolean(),
  validation: z.unknown().nullable(),
  options: z.unknown().nullable(),
  defaultValue: z.string().nullable(),
  showConditions: z.unknown().nullable(),
  order: z.number().int(),
  styles: z.unknown().nullable(),
});

const draftSnapshotSchema = z.object({
  form: draftFormSchema.nullable(),
  steps: z.array(draftStepSchema).max(100),
  fields: z.array(draftFieldSchema).max(2_500),
});

export type PublicFormSnapshotResult = {
  source: PublishedFormSource;
  errors: string[];
  warnings: string[];
};

export function buildPublicFormSnapshot(
  value: unknown,
): PublicFormSnapshotResult {
  const draft = draftSnapshotSchema.safeParse(value);
  if (!draft.success) {
    return invalidSnapshot("The form definition is invalid.");
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedForm = draft.data.form
    ? publishedFormSourceSchema.shape.form.safeParse({
        ...draft.data.form,
        workflowId: null,
        updatedAt:
          draft.data.form.updatedAt instanceof Date
            ? draft.data.form.updatedAt.toISOString()
            : draft.data.form.updatedAt,
      })
    : null;
  if (!parsedForm || !parsedForm.success || parsedForm.data === null) {
    errors.push(
      draft.data.form
        ? "The form settings are invalid for public publication."
        : "The form source no longer exists.",
    );
  }

  const fieldsByStep = new Map<
    string,
    Array<z.infer<typeof publicFormFieldSchema>>
  >();
  for (const field of draft.data.fields) {
    const blockedType = blockedPublicFormFieldTypeSchema.safeParse(field.type);
    if (blockedType.success) {
      errors.push(blockedFieldMessage(field.label, blockedType.data));
      continue;
    }
    if (field.showConditions !== null) {
      errors.push(
        `Field "${field.label}" uses conditional visibility, which is not supported by public forms yet.`,
      );
      continue;
    }
    const parsedField = publicFormFieldSchema.safeParse({
      id: field.id,
      type: field.type,
      label: field.label,
      placeholder: field.placeholder,
      helpText: field.helpText,
      required: field.required,
      validation: field.validation ?? {},
      options: field.options ?? [],
      defaultValue: field.defaultValue,
      order: field.order,
    });
    if (!parsedField.success) {
      errors.push(`Field "${field.label}" has an invalid public definition.`);
      continue;
    }
    if (field.styles !== null) {
      warnings.push(
        `Field-specific styles for "${field.label}" are omitted; the publication theme is used instead.`,
      );
    }
    const stepFields = fieldsByStep.get(field.stepId) ?? [];
    stepFields.push(parsedField.data);
    fieldsByStep.set(field.stepId, stepFields);
  }

  const steps = draft.data.steps.map((step) => {
    if (step.showConditions !== null) {
      errors.push(
        `Step "${step.name}" uses conditional visibility, which is not supported by public forms yet.`,
      );
    }
    return {
      id: step.id,
      name: step.name,
      order: step.order,
      fields: (fieldsByStep.get(step.id) ?? []).sort(compareOrder),
    };
  });
  if (steps.length === 0) errors.push("Add at least one form step.");
  for (const step of steps) {
    if (step.fields.length === 0) {
      errors.push(`Step "${step.name}" must contain a supported form field.`);
    }
  }
  if (steps.every((step) => step.fields.length === 0)) {
    errors.push("Add at least one supported form field.");
  }
  const knownStepIds = new Set(steps.map((step) => step.id));
  if ([...fieldsByStep.keys()].some((stepId) => !knownStepIds.has(stepId))) {
    errors.push("Every form field must belong to a published form step.");
  }
  if (
    parsedForm?.success &&
    parsedForm.data &&
    !parsedForm.data.isMultiStep &&
    steps.length !== 1
  ) {
    errors.push("A single-step form must contain exactly one step.");
  }
  const parsedSource = publishedFormSourceSchema.safeParse({
    type: "FORM",
    definitionSchemaVersion: PUBLIC_FORM_DEFINITION_SCHEMA_VERSION,
    form: parsedForm?.success ? parsedForm.data : null,
    steps: steps.sort(compareOrder),
  });
  if (!parsedSource.success) {
    errors.push("The form structure is invalid for public publication.");
    return {
      source: emptyPublicFormSource(),
      errors: unique(errors),
      warnings: unique(warnings),
    };
  }
  return {
    source: parsedSource.data,
    errors: unique(errors),
    warnings: unique(warnings),
  };
}

function invalidSnapshot(message: string): PublicFormSnapshotResult {
  return {
    source: emptyPublicFormSource(),
    errors: [message],
    warnings: [],
  };
}

function emptyPublicFormSource(): PublishedFormSource {
  return {
    type: "FORM",
    definitionSchemaVersion: PUBLIC_FORM_DEFINITION_SCHEMA_VERSION,
    form: null,
    steps: [],
  };
}

function compareOrder(
  left: { order: number; id: string },
  right: { order: number; id: string },
): number {
  return left.order - right.order || left.id.localeCompare(right.id);
}

function blockedFieldMessage(
  label: string,
  type: z.infer<typeof blockedPublicFormFieldTypeSchema>,
): string {
  if (type === "PAYMENT") {
    return `Payment field "${label}" requires an exact organization/location-owned Stripe connection before it can be published.`;
  }
  if (type === "FILE_UPLOAD") {
    return `File field "${label}" requires an exact organization/location-owned storage connection before it can be published.`;
  }
  return `Signature field "${label}" requires scoped storage and a retention policy before it can be published.`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
