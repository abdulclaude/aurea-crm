import { z } from "zod";

export const STRIPE_REFUND_REASON_VALUES = [
  "requested_by_customer",
  "duplicate",
  "fraudulent",
] as const;

export const stripeRefundReasonSchema = z.enum(STRIPE_REFUND_REASON_VALUES);

export const requestRefundInputSchema = z.object({
  ledgerEntryId: z.string().uuid(),
  requestId: z.string().uuid(),
  amountMinor: z.number().int().positive().safe(),
  reason: stripeRefundReasonSchema.default("requested_by_customer"),
});

export const requestRefundOutputSchema = z.object({
  operationId: z.string().uuid(),
  providerRefundId: z.string().nullable(),
  status: z.enum([
    "CREATED",
    "PROVIDER_PENDING",
    "REQUIRES_ACTION",
    "SUCCEEDED",
    "FAILED",
    "CANCELLED",
  ]),
});

export type StripeRefundReason = z.infer<typeof stripeRefundReasonSchema>;
export type RequestRefundInput = z.infer<typeof requestRefundInputSchema>;
export type RequestRefundOutput = z.infer<typeof requestRefundOutputSchema>;
