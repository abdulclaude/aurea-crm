import { z } from "zod";

export const STAFF_AVAILABILITY_MODES = [
  "AVAILABILITY_REQUIRED",
  "ROTA_REQUIRED",
] as const;

export const TIME_CLOCK_ROUNDING_MINUTES = [1, 5, 6, 10, 15, 30] as const;

export const TIME_ENTRY_APPROVAL_MODES = [
  "MANAGER_REQUIRED",
  "AUTO_APPROVE",
] as const;

export const staffOperationsPolicyValuesSchema = z
  .object({
    publicInstructorProfilesByDefault: z.boolean(),
    availabilityMode: z.enum(STAFF_AVAILABILITY_MODES),
    staffCanEditAvailability: z.boolean(),
    shiftSwapRequiresApproval: z.boolean(),
    timeOffRequiresApproval: z.boolean(),
    timeClockRoundingMinutes: z.union(
      TIME_CLOCK_ROUNDING_MINUTES.map((value) => z.literal(value)) as [
        z.ZodLiteral<1>,
        z.ZodLiteral<5>,
        z.ZodLiteral<6>,
        z.ZodLiteral<10>,
        z.ZodLiteral<15>,
        z.ZodLiteral<30>,
      ],
    ),
    breakRequiredAfterMinutes: z.number().int().min(1).max(1440).nullable(),
    minimumBreakMinutes: z.number().int().min(0).max(240),
    timeEntryApprovalMode: z.enum(TIME_ENTRY_APPROVAL_MODES),
  })
  .superRefine((values, context) => {
    if (values.breakRequiredAfterMinutes === null) {
      if (values.minimumBreakMinutes !== 0) {
        context.addIssue({
          code: "custom",
          path: ["minimumBreakMinutes"],
          message: "A break length requires a break threshold.",
        });
      }
      return;
    }
    if (
      values.minimumBreakMinutes === 0 ||
      values.minimumBreakMinutes >= values.breakRequiredAfterMinutes
    ) {
      context.addIssue({
        code: "custom",
        path: ["minimumBreakMinutes"],
        message: "The minimum break must be shorter than its threshold.",
      });
    }
  });

export const saveStaffOperationsPolicySchema = z.object({
  values: staffOperationsPolicyValuesSchema,
  expectedVersion: z.number().int().positive().nullable(),
  effectiveFrom: z.coerce.date().optional(),
  changeNote: z.string().trim().max(240).nullable().default(null),
});

export const staffOperationsPolicyVersionSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  values: staffOperationsPolicyValuesSchema,
  effectiveFrom: z.date(),
  changeNote: z.string().nullable(),
  createdAt: z.date(),
});

export const staffOperationsPolicyViewSchema = z.object({
  scope: z.object({
    organizationId: z.string(),
    locationId: z.string().nullable(),
  }),
  currentVersion: staffOperationsPolicyVersionSchema.nullable(),
});

export const createStaffCompensationTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().default(null),
  hourlyRate: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
  effectiveFrom: z.coerce.date().optional(),
  changeNote: z.string().trim().max(240).nullable().default(null),
});

export const versionStaffCompensationTemplateSchema = z.object({
  templateId: z.string().min(1).max(128),
  expectedVersion: z.number().int().positive(),
  hourlyRate: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
  effectiveFrom: z.coerce.date().optional(),
  changeNote: z.string().trim().max(240).nullable().default(null),
});

export const staffCompensationTemplateVersionSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  hourlyRate: z.string(),
  currency: z.string(),
  effectiveFrom: z.date(),
  changeNote: z.string().nullable(),
});

export const staffCompensationTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  currentVersion: staffCompensationTemplateVersionSchema.nullable(),
  createdAt: z.date(),
});

export const assignStaffCompensationTemplateSchema = z.object({
  instructorId: z.string().min(1).max(128),
  templateVersionId: z.string().min(1).max(128),
  effectiveFrom: z.coerce.date(),
});

export const staffCompensationAssignmentSchema = z.object({
  id: z.string(),
  instructorId: z.string(),
  instructorName: z.string(),
  templateVersionId: z.string(),
  templateName: z.string(),
  version: z.number().int().positive(),
  hourlyRate: z.string(),
  currency: z.string(),
  effectiveFrom: z.date(),
  effectiveTo: z.date().nullable(),
});

export const assignableInstructorSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type StaffOperationsPolicyValues = z.infer<
  typeof staffOperationsPolicyValuesSchema
>;
export type StaffOperationsPolicyVersion = z.infer<
  typeof staffOperationsPolicyVersionSchema
>;
export type StaffCompensationTemplate = z.infer<
  typeof staffCompensationTemplateSchema
>;
export type StaffCompensationAssignment = z.infer<
  typeof staffCompensationAssignmentSchema
>;
