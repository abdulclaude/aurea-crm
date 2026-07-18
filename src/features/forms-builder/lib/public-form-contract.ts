import { z } from "zod";
import {
  DEFAULT_FORM_AUTOMATION_CONFIG,
  formAutomationConfigSchema,
} from "@/features/forms-builder/lib/form-automation-config";
import {
  DEFAULT_FORM_CRM_RESOLUTION_CONFIG,
  formCrmResolutionConfigSchema,
} from "@/features/forms-builder/lib/form-crm-resolution";
import {
  DEFAULT_FORM_THEME,
  formColorSchema,
} from "@/features/forms-builder/lib/form-theme";
import {
  DEFAULT_FORM_PROGRESS_DISPLAY,
  formProgressDisplaySchema,
} from "@/features/forms-builder/lib/form-progress";

export const PUBLIC_FORM_DEFINITION_SCHEMA_VERSION = 1 as const;

export const publicFormFieldTypeSchema = z.enum([
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "URL",
  "DATE",
  "TIME",
  "DATETIME",
  "SELECT",
  "RADIO",
  "CHECKBOX",
  "MULTI_SELECT",
  "RATING",
  "SLIDER",
]);

export type PublicFormFieldType = z.infer<typeof publicFormFieldTypeSchema>;

export const PUBLIC_FORM_CONTROL_BY_FIELD_TYPE = {
  SHORT_TEXT: "INPUT",
  LONG_TEXT: "TEXTAREA",
  EMAIL: "INPUT",
  PHONE: "INPUT",
  NUMBER: "INPUT",
  URL: "INPUT",
  DATE: "INPUT",
  TIME: "INPUT",
  DATETIME: "INPUT",
  SELECT: "SELECT",
  RADIO: "RADIO",
  CHECKBOX: "CHECKBOX",
  MULTI_SELECT: "MULTI_SELECT",
  RATING: "RATING",
  SLIDER: "SLIDER",
} as const satisfies Record<
  PublicFormFieldType,
  | "INPUT"
  | "TEXTAREA"
  | "SELECT"
  | "RADIO"
  | "CHECKBOX"
  | "MULTI_SELECT"
  | "RATING"
  | "SLIDER"
>;

export const blockedPublicFormFieldTypeSchema = z.enum([
  "FILE_UPLOAD",
  "SIGNATURE",
  "PAYMENT",
]);

export const publicFormValidationRulesSchema = z
  .object({
    minLength: z.number().int().min(0).max(10_000).optional(),
    maxLength: z.number().int().min(1).max(10_000).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    step: z.number().positive().finite().optional(),
  })
  .strict()
  .superRefine((rules, context) => {
    if (
      rules.minLength !== undefined &&
      rules.maxLength !== undefined &&
      rules.minLength > rules.maxLength
    ) {
      context.addIssue({
        code: "custom",
        message: "Minimum length cannot exceed maximum length.",
      });
    }
    if (
      rules.min !== undefined &&
      rules.max !== undefined &&
      rules.min > rules.max
    ) {
      context.addIssue({
        code: "custom",
        message: "Minimum value cannot exceed maximum value.",
      });
    }
  });

export const publicFormFieldSchema = z
  .object({
    id: z.string().min(1).max(128),
    type: publicFormFieldTypeSchema,
    label: z.string().trim().min(1).max(200),
    placeholder: z.string().trim().max(300).nullable(),
    helpText: z.string().trim().max(1_000).nullable(),
    required: z.boolean(),
    validation: publicFormValidationRulesSchema,
    options: z.array(z.string().trim().min(1).max(200)).max(100),
    defaultValue: z.string().max(10_000).nullable(),
    order: z.number().int().min(0),
  })
  .strict()
  .superRefine((field, context) => {
    const choiceField = ["SELECT", "RADIO", "MULTI_SELECT"].includes(
      field.type,
    );
    if (choiceField && field.options.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Choice fields require at least one option.",
      });
    }
    if (new Set(field.options).size !== field.options.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Field options must be unique.",
      });
    }
    if (
      field.defaultValue &&
      ["SELECT", "RADIO"].includes(field.type) &&
      !field.options.includes(field.defaultValue)
    ) {
      context.addIssue({
        code: "custom",
        path: ["defaultValue"],
        message: "The default value must match a configured option.",
      });
    }
    if (
      field.defaultValue &&
      field.type === "MULTI_SELECT" &&
      field.defaultValue
        .split(",")
        .map((value) => value.trim())
        .some((value) => !field.options.includes(value))
    ) {
      context.addIssue({
        code: "custom",
        path: ["defaultValue"],
        message: "Every default value must match a configured option.",
      });
    }
    if (
      field.defaultValue &&
      field.type === "CHECKBOX" &&
      !["true", "false"].includes(field.defaultValue)
    ) {
      context.addIssue({
        code: "custom",
        path: ["defaultValue"],
        message: "Checkbox defaults must be true or false.",
      });
    }
    if (
      field.defaultValue &&
      ["NUMBER", "RATING", "SLIDER"].includes(field.type)
    ) {
      const numericDefault = Number(field.defaultValue);
      if (
        !Number.isFinite(numericDefault) ||
        (field.validation.min !== undefined &&
          numericDefault < field.validation.min) ||
        (field.validation.max !== undefined &&
          numericDefault > field.validation.max) ||
        (field.type === "RATING" &&
          (!Number.isInteger(numericDefault) ||
            numericDefault < 1 ||
            numericDefault > 5))
      ) {
        context.addIssue({
          code: "custom",
          path: ["defaultValue"],
          message: "The numeric default is outside the allowed range.",
        });
      }
    }
  });

export const publicFormStepSchema = z
  .object({
    id: z.string().min(1).max(128),
    name: z.string().trim().min(1).max(200),
    order: z.number().int().min(0),
    fields: z.array(publicFormFieldSchema).max(250),
  })
  .strict();

const safeRedirectUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Only HTTP and HTTPS redirect URLs are supported.")
  .nullable();

export const publishedFormSourceSchema = z
  .object({
    type: z.literal("FORM"),
    definitionSchemaVersion: z.literal(PUBLIC_FORM_DEFINITION_SCHEMA_VERSION),
    form: z
      .object({
        id: z.string().min(1).max(128),
        name: z.string().trim().min(1).max(200),
        description: z.string().trim().max(5_000).nullable(),
        isMultiStep: z.boolean(),
        showProgress: z.boolean(),
        progressDisplay: formProgressDisplaySchema.default(
          DEFAULT_FORM_PROGRESS_DISPLAY,
        ),
        successMessage: z.string().trim().min(1).max(2_000),
        redirectUrl: safeRedirectUrlSchema,
        workflowId: z.string().min(1).max(128).nullable(),
        crmResolutionConfig: formCrmResolutionConfigSchema.default(
          DEFAULT_FORM_CRM_RESOLUTION_CONFIG,
        ),
        automationConfig: formAutomationConfigSchema.default(
          DEFAULT_FORM_AUTOMATION_CONFIG,
        ),
        primaryColor: formColorSchema.default(DEFAULT_FORM_THEME.primaryColor),
        buttonTextColor: formColorSchema.default(
          DEFAULT_FORM_THEME.buttonTextColor,
        ),
        backgroundColor: formColorSchema.default(
          DEFAULT_FORM_THEME.backgroundColor,
        ),
        textColor: formColorSchema.default(DEFAULT_FORM_THEME.textColor),
        locationId: z.string().min(1).max(128).nullable(),
        updatedAt: z.string().datetime(),
      })
      .strict()
      .nullable(),
    steps: z.array(publicFormStepSchema).max(100),
  })
  .strict()
  .superRefine((source, context) => {
    const stepIds = source.steps.map((step) => step.id);
    if (new Set(stepIds).size !== stepIds.length) {
      context.addIssue({ code: "custom", message: "Step IDs must be unique." });
    }
    const fieldIds = source.steps.flatMap((step) =>
      step.fields.map((field) => field.id),
    );
    if (new Set(fieldIds).size !== fieldIds.length) {
      context.addIssue({
        code: "custom",
        message: "Field IDs must be unique.",
      });
    }
  });

export type PublicFormField = z.infer<typeof publicFormFieldSchema>;
export type PublishedFormSource = z.infer<typeof publishedFormSourceSchema>;
