import { z } from "zod";

import {
  ledgerKindSchema,
  ledgerStatusSchema,
  reconciliationIssueTypeSchema,
  reconciliationRunStatusSchema,
  reconciliationSeveritySchema,
  reconciliationStatusSchema,
  stripeEventStatusSchema,
} from "@/features/commerce/reconciliation-contracts";

const cursorOutputSchema = z
  .object({ at: z.date(), id: z.string() })
  .nullable();

export const reconciliationIssueDetailsSchema = z.record(
  z.string(),
  z.unknown(),
);

export const ledgerEntryListItemSchema = z.object({
  id: z.string(),
  provider: z.string(),
  stripeConnectionId: z.string().nullable(),
  providerObjectId: z.string(),
  providerObjectType: z.string(),
  kind: ledgerKindSchema,
  status: ledgerStatusSchema,
  amountMinor: z.number().int().safe(),
  reservedRefundMinor: z.number().int().safe().nonnegative(),
  refundableMinor: z.number().int().safe().nonnegative(),
  feeMinor: z.number().int().safe().nullable(),
  netMinor: z.number().int().safe().nullable(),
  currency: z.string(),
  currencyExponent: z.number().int(),
  paymentIntentId: z.string().nullable(),
  chargeId: z.string().nullable(),
  checkoutSessionId: z.string().nullable(),
  clientId: z.string().nullable(),
  clientName: z.string().nullable(),
  clientEmail: z.string().nullable(),
  locationId: z.string().nullable(),
  locationName: z.string().nullable(),
  invoiceId: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  occurredAt: z.date(),
});

export const stripeEventListItemSchema = z.object({
  id: z.string(),
  stripeEventId: z.string(),
  type: z.string(),
  source: z.string(),
  status: stripeEventStatusSchema,
  stripeAccountId: z.string().nullable(),
  stripeConnectionId: z.string().nullable(),
  instructorId: z.string().nullable(),
  locationId: z.string().nullable(),
  locationName: z.string().nullable(),
  livemode: z.boolean(),
  objectId: z.string().nullable(),
  objectType: z.string().nullable(),
  attempts: z.number().int(),
  maxAttempts: z.number().int(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  receivedAt: z.date(),
  lastAttemptAt: z.date().nullable(),
  nextAttemptAt: z.date().nullable(),
  processedAt: z.date().nullable(),
});

export const reconciliationRunListItemSchema = z.object({
  id: z.string(),
  provider: z.string(),
  locationId: z.string().nullable(),
  locationName: z.string().nullable(),
  status: reconciliationRunStatusSchema,
  windowStart: z.date(),
  windowEnd: z.date(),
  providerRecords: z.number().int(),
  localRecords: z.number().int(),
  issuesFound: z.number().int(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.date(),
});

export const reconciliationIssueListItemSchema = z.object({
  id: z.string(),
  type: reconciliationIssueTypeSchema,
  severity: reconciliationSeveritySchema,
  status: reconciliationStatusSchema,
  locationId: z.string().nullable(),
  locationName: z.string().nullable(),
  ledgerEntryId: z.string().nullable(),
  stripeEventId: z.string().nullable(),
  localEntityType: z.string().nullable(),
  localEntityId: z.string().nullable(),
  providerObjectId: z.string().nullable(),
  expected: reconciliationIssueDetailsSchema,
  actual: reconciliationIssueDetailsSchema,
  recoveryAction: z.string().nullable(),
  detectedAt: z.date(),
  lastSeenAt: z.date(),
  acknowledgedAt: z.date().nullable(),
  resolvedAt: z.date().nullable(),
  resolutionNote: z.string().nullable(),
});

export const ledgerPageOutputSchema = z.object({
  items: z.array(ledgerEntryListItemSchema),
  nextCursor: cursorOutputSchema,
});
export const stripeEventPageOutputSchema = z.object({
  items: z.array(stripeEventListItemSchema),
  nextCursor: cursorOutputSchema,
});
export const reconciliationRunPageOutputSchema = z.object({
  items: z.array(reconciliationRunListItemSchema),
  nextCursor: cursorOutputSchema,
});
export const reconciliationIssuePageOutputSchema = z.object({
  items: z.array(reconciliationIssueListItemSchema),
  nextCursor: cursorOutputSchema,
});

export const requestedReconciliationRunSchema = z.object({
  id: z.string(),
  status: reconciliationRunStatusSchema,
  created: z.boolean(),
});
export const acknowledgedIssueOutputSchema = z.object({
  id: z.string(),
  status: z.literal("ACKNOWLEDGED"),
});
export const resolvedIssueOutputSchema = z.object({
  id: z.string(),
  status: z.literal("RESOLVED"),
});

export type LedgerEntryListItem = z.infer<typeof ledgerEntryListItemSchema>;
export type StripeEventListItem = z.infer<typeof stripeEventListItemSchema>;
export type ReconciliationRunListItem = z.infer<
  typeof reconciliationRunListItemSchema
>;
export type ReconciliationIssueListItem = z.infer<
  typeof reconciliationIssueListItemSchema
>;
export type RequestedReconciliationRun = z.infer<
  typeof requestedReconciliationRunSchema
>;
export type AcknowledgedIssueOutput = z.infer<
  typeof acknowledgedIssueOutputSchema
>;
export type ResolvedIssueOutput = z.infer<typeof resolvedIssueOutputSchema>;
