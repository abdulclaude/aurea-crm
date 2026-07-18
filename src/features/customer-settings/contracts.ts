import { z } from "zod";

export const customerFieldTypes = [
  "TEXT",
  "NUMBER",
  "DATE",
  "BOOLEAN",
  "SELECT",
  "MULTI_SELECT",
] as const;

export const householdSharingKeys = [
  "CONTACT_DETAILS",
  "BOOKING_HISTORY",
  "MEMBERSHIPS",
  "ACCOUNT_BALANCE",
  "NOTES",
  "DOCUMENTS",
] as const;

const idSchema = z.string().min(1).max(128);
const nameSchema = z.string().trim().min(1).max(100);
const descriptionSchema = z.string().trim().max(500).nullable().default(null);
const fieldKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Use lowercase letters, numbers, and underscores.",
  );
const optionSchema = z.string().trim().min(1).max(80);

export const customerFieldDefinitionValuesSchema = z
  .object({
    key: fieldKeySchema,
    label: nameSchema,
    description: descriptionSchema,
    fieldType: z.enum(customerFieldTypes),
    isRequired: z.boolean().default(false),
    options: z.array(optionSchema).max(50).default([]),
  })
  .superRefine((value, ctx) => {
    const hasOptions =
      value.fieldType === "SELECT" || value.fieldType === "MULTI_SELECT";
    if (hasOptions && value.options.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Select fields need at least one option.",
      });
    }
    if (!hasOptions && value.options.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Only select fields can have options.",
      });
    }
    if (
      new Set(value.options.map((option) => option.toLowerCase())).size !==
      value.options.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Options must be unique.",
      });
    }
  });

export const createCustomerFieldDefinitionSchema =
  customerFieldDefinitionValuesSchema.strict();
export const updateCustomerFieldDefinitionSchema =
  customerFieldDefinitionValuesSchema.safeExtend({ id: idSchema }).strict();
export const archiveCustomerFieldDefinitionSchema = z
  .object({ id: idSchema })
  .strict();

export const customerTagDefinitionValuesSchema = z.object({
  name: nameSchema,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .default(null),
  description: descriptionSchema,
});
export const createCustomerTagDefinitionSchema =
  customerTagDefinitionValuesSchema.strict();
export const updateCustomerTagDefinitionSchema =
  customerTagDefinitionValuesSchema.extend({ id: idSchema }).strict();
export const archiveCustomerTagDefinitionSchema = z
  .object({ id: idSchema })
  .strict();

export const customerNoteTemplateValuesSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  content: z.string().trim().min(1).max(10_000),
});
export const createCustomerNoteTemplateSchema =
  customerNoteTemplateValuesSchema.strict();
export const updateCustomerNoteTemplateSchema = customerNoteTemplateValuesSchema
  .extend({ id: idSchema })
  .strict();
export const archiveCustomerNoteTemplateSchema = z
  .object({ id: idSchema })
  .strict();

export const householdRelationshipDefinitionSchema = z.object({
  key: fieldKeySchema,
  label: nameSchema,
  reciprocalLabel: z.string().trim().max(100).nullable().default(null),
});
export const householdSharingPolicyValuesSchema = z
  .object({
    relationships: z.array(householdRelationshipDefinitionSchema).max(40),
    sharedData: z.array(z.enum(householdSharingKeys)).default([]),
    requirePrimaryContactApproval: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.relationships.map((relationship) => relationship.key))
        .size !== value.relationships.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["relationships"],
        message: "Relationship keys must be unique.",
      });
    }
  });

export const saveHouseholdSharingPolicySchema = z
  .object({
    values: householdSharingPolicyValuesSchema,
    expectedVersion: z.number().int().positive().nullable(),
    changeNote: z.string().trim().max(240).nullable().default(null),
  })
  .strict();

export type CustomerFieldDefinitionValues = z.infer<
  typeof customerFieldDefinitionValuesSchema
>;
export type HouseholdSharingPolicyValues = z.infer<
  typeof householdSharingPolicyValuesSchema
>;
