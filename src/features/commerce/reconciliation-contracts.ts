import { z } from "zod";

export const RECEIPT_RECONCILIATION_PROVIDER = "STRIPE_RECEIPTS";

export const LEDGER_KIND_VALUES = [
  "PAYMENT",
  "REFUND",
  "DISPUTE",
  "PAYOUT",
  "CREDIT",
  "ADJUSTMENT",
] as const;

export const LEDGER_STATUS_VALUES = [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "DISPUTED",
  "WON",
  "LOST",
  "CANCELLED",
] as const;

export const STRIPE_EVENT_STATUS_VALUES = [
  "RECEIVED",
  "PROCESSING",
  "PROCESSED",
  "IGNORED",
  "FAILED",
  "DEAD_LETTER",
] as const;

export const RECONCILIATION_ISSUE_TYPE_VALUES = [
  "MISSING_PROVIDER_RECORD",
  "MISSING_LOCAL_RECORD",
  "AMOUNT_MISMATCH",
  "CURRENCY_MISMATCH",
  "STATUS_MISMATCH",
  "DUPLICATE_RECORD",
  "ORPHANED_REFERENCE",
] as const;

export const RECONCILIATION_SEVERITY_VALUES = [
  "INFO",
  "WARNING",
  "CRITICAL",
] as const;

export const RECONCILIATION_STATUS_VALUES = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "IGNORED",
] as const;

export const RECONCILIATION_RUN_STATUS_VALUES = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
] as const;

export const ledgerKindSchema = z.enum(LEDGER_KIND_VALUES);
export const ledgerStatusSchema = z.enum(LEDGER_STATUS_VALUES);
export const stripeEventStatusSchema = z.enum(STRIPE_EVENT_STATUS_VALUES);
export const reconciliationIssueTypeSchema = z.enum(
  RECONCILIATION_ISSUE_TYPE_VALUES,
);
export const reconciliationSeveritySchema = z.enum(
  RECONCILIATION_SEVERITY_VALUES,
);
export const reconciliationStatusSchema = z.enum(
  RECONCILIATION_STATUS_VALUES,
);
export const reconciliationRunStatusSchema = z.enum(
  RECONCILIATION_RUN_STATUS_VALUES,
);

export const dateIdCursorSchema = z.object({
  at: z.coerce.date(),
  id: z.string().min(1),
});

const pageSizeSchema = z.number().int().min(1).max(100).default(25);

export const listLedgerEntriesInputSchema = z.object({
  cursor: dateIdCursorSchema.optional(),
  limit: pageSizeSchema,
  kind: ledgerKindSchema.optional(),
  status: ledgerStatusSchema.optional(),
  query: z.string().trim().max(100).optional(),
});

export const listStripeEventsInputSchema = z.object({
  cursor: dateIdCursorSchema.optional(),
  limit: pageSizeSchema,
  status: stripeEventStatusSchema.optional(),
  eventType: z.string().trim().max(100).optional(),
});

export const listReconciliationRunsInputSchema = z.object({
  cursor: dateIdCursorSchema.optional(),
  limit: pageSizeSchema,
  status: reconciliationRunStatusSchema.optional(),
});

export const listReconciliationIssuesInputSchema = z.object({
  cursor: dateIdCursorSchema.optional(),
  limit: pageSizeSchema,
  status: reconciliationStatusSchema.optional(),
  type: reconciliationIssueTypeSchema.optional(),
  severity: reconciliationSeveritySchema.optional(),
});

export const requestReconciliationRunInputSchema = z
  .object({
    windowStart: z.coerce.date(),
    windowEnd: z.coerce.date(),
  })
  .superRefine((value, ctx) => {
    const durationMs = value.windowEnd.getTime() - value.windowStart.getTime();
    if (durationMs <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "The reconciliation window must end after it starts.",
        path: ["windowEnd"],
      });
    }
    if (durationMs > 31 * 24 * 60 * 60 * 1_000) {
      ctx.addIssue({
        code: "custom",
        message: "The reconciliation window cannot exceed 31 days.",
        path: ["windowEnd"],
      });
    }
  });

export const reconciliationIssueIdSchema = z.object({
  id: z.string().uuid(),
});

export const resolveReconciliationIssueInputSchema = z.object({
  id: z.string().uuid(),
  resolutionNote: z.string().trim().min(3).max(1_000),
});

export type DateIdCursor = z.infer<typeof dateIdCursorSchema>;
export type ListLedgerEntriesInput = z.infer<
  typeof listLedgerEntriesInputSchema
>;
export type ListStripeEventsInput = z.infer<
  typeof listStripeEventsInputSchema
>;
export type ListReconciliationRunsInput = z.infer<
  typeof listReconciliationRunsInputSchema
>;
export type ListReconciliationIssuesInput = z.infer<
  typeof listReconciliationIssuesInputSchema
>;
