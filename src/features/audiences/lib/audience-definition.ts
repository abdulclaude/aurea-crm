import { z } from "zod";

import {
  ACQUISITION_STAGE_VALUES,
  CLIENT_TYPE_VALUES,
  LIFECYCLE_STAGE_VALUES,
} from "@/features/crm/constants";

const identifierListSchema = z
  .array(z.string().trim().min(1).max(128))
  .max(100)
  .refine((values) => new Set(values).size === values.length, {
    message: "Values must be unique",
  });

const labelListSchema = z
  .array(z.string().trim().min(1).max(100))
  .max(100)
  .refine((values) => new Set(values).size === values.length, {
    message: "Values must be unique",
  });

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Enter a date in YYYY-MM-DD format",
});

const legacyTimestampSchema = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "Enter a valid ISO timestamp",
);

const decimalMoneySchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,6})?$/, "Enter a non-negative decimal amount");

export const audienceDateRangeSchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
  })
  .strict()
  .refine((range) => range.from || range.to, {
    message: "A date range needs a start or end",
  })
  .refine(
    (range) => !range.from || !range.to || range.from <= range.to,
    { message: "The start date must be before the end date" },
  );

const legacyDateRangeSchema = z
  .object({
    from: legacyTimestampSchema.optional(),
    to: legacyTimestampSchema.optional(),
  })
  .strict()
  .nullable();

const baseDefinitionFields = {
  search: z.string().trim().max(120).default(""),
  types: z
    .array(z.enum(CLIENT_TYPE_VALUES))
    .max(CLIENT_TYPE_VALUES.length)
    .default([]),
  lifecycleStages: z
    .array(z.enum(LIFECYCLE_STAGE_VALUES))
    .max(LIFECYCLE_STAGE_VALUES.length)
    .default([]),
  acquisitionStages: z
    .array(z.enum(ACQUISITION_STAGE_VALUES))
    .max(ACQUISITION_STAGE_VALUES.length)
    .default([]),
  countries: labelListSchema.default([]),
  sources: labelListSchema.default([]),
  assigneeIds: identifierListSchema.default([]),
  instructorIds: identifierListSchema.default([]),
};

const legacySavedAudienceDefinitionSchema = z
  .object({
    version: z.literal(1),
    operator: z.literal("AND"),
    ...baseDefinitionFields,
    tags: z
      .object({
        mode: z.enum(["ANY", "ALL"]),
        values: labelListSchema,
      })
      .strict()
      .default({ mode: "ANY", values: [] }),
    createdAt: legacyDateRangeSchema.default(null),
    lastInteractionAt: legacyDateRangeSchema.default(null),
  })
  .strict();

export const savedAudienceDefinitionV2Schema = z
  .object({
    version: z.literal(2),
    operator: z.enum(["AND", "OR"]).default("AND"),
    ...baseDefinitionFields,
    tags: z
      .object({
        mode: z.enum(["ANY", "ALL", "NONE"]),
        values: labelListSchema,
      })
      .strict()
      .default({ mode: "ANY", values: [] }),
    createdAt: audienceDateRangeSchema.nullable().default(null),
    lastInteractionAt: audienceDateRangeSchema.nullable().default(null),
    membership: z
      .object({
        statuses: z
          .array(z.enum(["ACTIVE", "INACTIVE", "CANCELLED", "EXPIRED", "PAUSED"]))
          .max(5)
          .default([]),
        planIds: identifierListSchema.default([]),
      })
      .strict()
      .default({ statuses: [], planIds: [] }),
    commerce: z
      .object({
        paymentState: z.enum(["ANY", "SUCCEEDED", "FAILED", "NEVER_PAID"]).default("ANY"),
        minimumLifetimeSpend: z
          .object({
            amount: decimalMoneySchema,
            currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
          })
          .strict()
          .nullable()
          .default(null),
      })
      .strict()
      .default({ paymentState: "ANY", minimumLifetimeSpend: null }),
    attendance: z
      .object({
        minimumVisits: z.number().int().min(0).max(1_000_000).nullable().default(null),
        maximumVisits: z.number().int().min(0).max(1_000_000).nullable().default(null),
        noVisitInDays: z.number().int().min(1).max(3_650).nullable().default(null),
        hasUpcomingBooking: z.boolean().nullable().default(null),
      })
      .strict()
      .refine(
        (value) =>
          value.minimumVisits === null ||
          value.maximumVisits === null ||
          value.minimumVisits <= value.maximumVisits,
        { message: "Minimum visits must not exceed maximum visits" },
      )
      .default({
        minimumVisits: null,
        maximumVisits: null,
        noVisitInDays: null,
        hasUpcomingBooking: null,
      }),
    emailEligibility: z
      .enum(["ANY", "ELIGIBLE", "SUPPRESSED", "INVALID"])
      .default("ANY"),
  })
  .strict();

export type SavedAudienceDefinition = z.infer<
  typeof savedAudienceDefinitionV2Schema
>;

function legacyDateOnly(value: string | undefined): string | undefined {
  return value?.slice(0, 10);
}

function upgradeLegacyDateRange(
  range: z.infer<typeof legacyDateRangeSchema>,
): z.infer<typeof audienceDateRangeSchema> | null {
  if (!range) return null;
  const from = legacyDateOnly(range.from);
  const to = legacyDateOnly(range.to);
  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

function upgradeLegacyDefinition(
  definition: z.infer<typeof legacySavedAudienceDefinitionSchema>,
): SavedAudienceDefinition {
  return savedAudienceDefinitionV2Schema.parse({
    ...definition,
    version: 2,
    createdAt: upgradeLegacyDateRange(definition.createdAt),
    lastInteractionAt: upgradeLegacyDateRange(definition.lastInteractionAt),
  });
}

export const savedAudienceDefinitionSchema = z
  .union([savedAudienceDefinitionV2Schema, legacySavedAudienceDefinitionSchema])
  .transform((definition): SavedAudienceDefinition =>
    definition.version === 2 ? definition : upgradeLegacyDefinition(definition),
  );

export function createEmptyAudienceDefinition(): SavedAudienceDefinition {
  return savedAudienceDefinitionV2Schema.parse({ version: 2 });
}

export function countAudienceFilters(
  definition: SavedAudienceDefinition,
): number {
  return [
    definition.search.length > 0,
    definition.types.length > 0,
    definition.lifecycleStages.length > 0,
    definition.acquisitionStages.length > 0,
    definition.tags.values.length > 0,
    definition.countries.length > 0,
    definition.sources.length > 0,
    definition.assigneeIds.length > 0,
    definition.instructorIds.length > 0,
    definition.createdAt !== null,
    definition.lastInteractionAt !== null,
    definition.membership.statuses.length > 0,
    definition.membership.planIds.length > 0,
    definition.commerce.paymentState !== "ANY",
    definition.commerce.minimumLifetimeSpend !== null,
    definition.attendance.minimumVisits !== null,
    definition.attendance.maximumVisits !== null,
    definition.attendance.noVisitInDays !== null,
    definition.attendance.hasUpcomingBooking !== null,
    definition.emailEligibility !== "ANY",
  ].filter(Boolean).length;
}
