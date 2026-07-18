import { z } from "zod";

export const REPORT_GROUP_VALUES = [
  "sales",
  "payment-processing",
  "clients",
  "staff",
  "inventory",
] as const;

export const reportGroupIdSchema = z.enum(REPORT_GROUP_VALUES);
export const reportViewVisibilitySchema = z.enum(["PERSONAL", "LOCATION"]);

export const reportViewDefinitionSchema = z
  .object({
    version: z.literal(1),
    search: z.string().trim().max(100).default(""),
    filters: z.record(
      z.string().min(1).max(100),
      z.array(z.string().max(250)).max(50),
    ),
    dateRange: z
      .object({
        fieldId: z.string().min(1).max(100),
        start: z.string().date(),
        end: z.string().date(),
      })
      .nullable(),
    sorting: z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          desc: z.boolean(),
        }),
      )
      .max(1),
    columnOrder: z.array(z.string().min(1).max(100)).max(100),
    columnVisibility: z.record(z.string().min(1).max(100), z.boolean()),
    pageSize: z.number().int().min(10).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.dateRange && value.dateRange.start > value.dateRange.end) {
      context.addIssue({
        code: "custom",
        message: "The report date range must end on or after it starts.",
        path: ["dateRange", "end"],
      });
    }
  });

export const reportIdentitySchema = z
  .object({
    groupId: reportGroupIdSchema,
    reportId: z.string().trim().min(1).max(100),
  })
  .strict();

export const savedReportViewInputSchema = reportIdentitySchema
  .extend({
    name: z.string().trim().min(1).max(100),
    visibility: reportViewVisibilitySchema,
    definition: reportViewDefinitionSchema,
  })
  .strict();

export const updateSavedReportViewInputSchema = savedReportViewInputSchema
  .extend({ id: z.string().min(1).max(128) })
  .strict();

export const savedReportViewIdSchema = z
  .object({ id: z.string().min(1).max(128) })
  .strict();

export const reportMetricUnitSchema = z.enum([
  "MONEY",
  "COUNT",
  "RATE",
  "DURATION",
]);

export const metricContractSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  decision: z.string(),
  unit: reportMetricUnitSchema,
  grain: z.string(),
  sourceOfTruth: z.string(),
  eligibility: z.string(),
  timestampField: z.string(),
  timezonePolicy: z.string(),
  currencyPolicy: z.string(),
  refundPolicy: z.string(),
  deduplicationKey: z.string(),
  lateDataPolicy: z.string(),
  dimensions: z.array(z.string()),
  reportIds: z.array(z.string()),
});

export const reportDataGapSchema = z.object({
  id: z.string(),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
  label: z.string(),
  detail: z.string(),
  count: z.number().int().nonnegative().nullable(),
});

export const reportDataHealthSchema = z.object({
  generatedAt: z.date(),
  dataAsOf: z.date().nullable(),
  lastReconciledAt: z.date().nullable(),
  freshness: z.enum(["CURRENT", "STALE", "NOT_RECONCILED", "NO_DATA"]),
  timezone: z.string(),
  locale: z.string(),
  currency: z.string(),
  weekStart: z.enum(["SUNDAY", "MONDAY", "SATURDAY"]),
  dateFormat: z.enum([
    "LOCALE",
    "MONTH_DAY_YEAR",
    "DAY_MONTH_YEAR",
    "YEAR_MONTH_DAY",
  ]),
  timeFormat: z.enum(["TWELVE_HOUR", "TWENTY_FOUR_HOUR"]),
  currencies: z.array(z.string()),
  gaps: z.array(reportDataGapSchema),
});

export const createReportExportInputSchema = reportIdentitySchema
  .extend({
    savedViewId: z.string().min(1).max(128).nullable(),
    definition: reportViewDefinitionSchema,
  })
  .strict();

export type ReportViewDefinition = z.infer<typeof reportViewDefinitionSchema>;
export type MetricContract = z.infer<typeof metricContractSchema>;
export type ReportDataHealth = z.infer<typeof reportDataHealthSchema>;
