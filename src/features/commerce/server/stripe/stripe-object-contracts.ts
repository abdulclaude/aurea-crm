import { z } from "zod";

const expandableIdSchema = z.union([
  z.string(),
  z.object({ id: z.string() }).passthrough(),
  z.null(),
]);

const metadataSchema = z.record(z.string(), z.string()).nullable().optional();

export const checkoutSessionSchema = z
  .object({
    id: z.string(),
    object: z.literal("checkout.session"),
    amount_total: z.number().int().nonnegative().nullable(),
    currency: z.string().nullable(),
    payment_status: z.string().optional(),
    payment_intent: expandableIdSchema.optional(),
    customer: expandableIdSchema.optional(),
    subscription: expandableIdSchema.optional(),
    metadata: metadataSchema,
  })
  .passthrough();

export const stripeInvoiceSchema = z
  .object({
    id: z.string(),
    object: z.literal("invoice"),
    amount_paid: z.number().int().nonnegative(),
    amount_due: z.number().int().nonnegative().optional(),
    attempt_count: z.number().int().nonnegative().optional(),
    next_payment_attempt: z.number().int().nullable().optional(),
    billing_reason: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    currency: z.string(),
    customer: expandableIdSchema.optional(),
    payment_intent: expandableIdSchema.optional(),
    subscription: expandableIdSchema.optional(),
    metadata: metadataSchema,
    parent: z
      .object({
        subscription_details: z
          .object({
            subscription: expandableIdSchema.optional(),
            metadata: metadataSchema,
          })
          .nullable()
          .optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export const paymentIntentSchema = z
  .object({
    id: z.string(),
    object: z.literal("payment_intent"),
    amount: z.number().int().nonnegative(),
    amount_received: z.number().int().nonnegative().optional(),
    application_fee_amount: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .optional(),
    currency: z.string(),
    status: z.string(),
    customer: expandableIdSchema.optional(),
    latest_charge: expandableIdSchema.optional(),
    transfer_data: z
      .object({ destination: expandableIdSchema })
      .nullable()
      .optional(),
    metadata: metadataSchema,
    last_payment_error: z
      .object({
        code: z.string().nullable().optional(),
        type: z.string().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export type StripePaymentIntentObject = z.infer<typeof paymentIntentSchema>;

export const refundSchema = z
  .object({
    id: z.string(),
    object: z.literal("refund"),
    amount: z.number().int().nonnegative(),
    currency: z.string(),
    status: z.string().nullable().optional(),
    payment_intent: expandableIdSchema.optional(),
    charge: expandableIdSchema.optional(),
    metadata: metadataSchema,
  })
  .passthrough();

export const disputeSchema = z
  .object({
    id: z.string(),
    object: z.literal("dispute"),
    amount: z.number().int().nonnegative(),
    currency: z.string(),
    status: z.string(),
    payment_intent: expandableIdSchema.optional(),
    charge: expandableIdSchema.optional(),
    metadata: metadataSchema,
  })
  .passthrough();

export const subscriptionSchema = z
  .object({
    id: z.string(),
    object: z.literal("subscription"),
    status: z.string(),
    customer: expandableIdSchema.optional(),
    cancel_at: z.number().int().nullable().optional(),
    metadata: metadataSchema,
  })
  .passthrough();

export function expandableId(
  value: z.infer<typeof expandableIdSchema> | undefined,
): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.id;
  return null;
}

export function metadataValue(
  metadata: Record<string, string> | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return value?.trim() ? value : null;
}

export function invoiceSubscriptionId(
  value: z.infer<typeof stripeInvoiceSchema>,
): string | null {
  return (
    expandableId(value.parent?.subscription_details?.subscription) ??
    expandableId(value.subscription)
  );
}
