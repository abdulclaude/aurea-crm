import "server-only";

import { normalizeCurrency } from "@/features/commerce/lib/money";

import { resolveOperationForStripeEvent } from "../operations";
import { PermanentStripeEventError } from "./stripe-event-contract";
import type { CommerceTransaction } from "./stripe-event-receipt";
import {
  expandableId,
  metadataValue,
  type checkoutSessionSchema,
} from "./stripe-object-contracts";
import { requireHistoricalStripeConnection } from "./stripe-connection-binding";
import type { z } from "zod";

type CheckoutSession = z.infer<typeof checkoutSessionSchema>;

export type ResolvedCheckoutKind =
  | "INVOICE"
  | "BOOKING"
  | "CLASS_BOOKING"
  | "MEMBERSHIP"
  | "GIFT_CARD"
  | "ACCOUNT_CREDIT";

export type ResolvedCheckout = {
  kind: ResolvedCheckoutKind;
  checkoutSessionId: string;
  operationId: string;
  organizationId: string;
  locationId: string | null;
  stripeConnectionId: string;
  providerAccountId: string;
  clientId: string | null;
  invoiceId: string | null;
  bookingId: string | null;
  studioBookingId: string | null;
  planId: string | null;
  pricingOptionId: string | null;
  amountMinor: number;
  currency: string;
  currencyExponent: number;
  paymentIntentId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  metadata: Record<string, string>;
};

export async function resolveCheckoutScope(input: {
  tx: CommerceTransaction;
  session: CheckoutSession;
  eventAccountId?: string | null;
}): Promise<ResolvedCheckout> {
  const metadata = input.session.metadata ?? {};
  const amountMinor = input.session.amount_total ?? 0;
  const currency = normalizeCurrency(input.session.currency ?? "GBP");
  const paymentIntentId = expandableId(input.session.payment_intent);
  const operation = await resolveOperationForStripeEvent({
    tx: input.tx,
    operationId: metadataValue(metadata, "commerceOperationId"),
    checkoutSessionId: input.session.id,
    paymentIntentId,
  });

  if (!operation) {
    throw new PermanentStripeEventError(
      "STRIPE_OPERATION_UNBOUND",
      "Stripe checkout has no stored commerce operation and cannot be scoped safely",
    );
  }
  if (
    operation.amountMinor !== amountMinor ||
    operation.currency !== currency
  ) {
    throw new PermanentStripeEventError(
      "OPERATION_AMOUNT_MISMATCH",
      "Stripe checkout values do not match the stored commerce operation",
    );
  }
  const metadataConnectionId = metadataValue(metadata, "stripeConnectionId");
  if (
    metadataConnectionId &&
    metadataConnectionId !== operation.stripeConnectionId
  ) {
    throw new PermanentStripeEventError(
      "STRIPE_ACCOUNT_SCOPE_MISMATCH",
      "Stripe checkout metadata does not match its stored account binding",
    );
  }

  const connection = await requireHistoricalStripeConnection({
    tx: input.tx,
    stripeConnectionId: operation.stripeConnectionId,
    organizationId: operation.organizationId,
    locationId: operation.locationId,
    providerAccountId: operation.providerAccountId,
    eventAccountId: input.eventAccountId,
    requireExternalSnapshot: true,
  });

  const kind = operation.invoiceId
    ? "INVOICE"
    : operation.bookingId
      ? "BOOKING"
      : operation.studioBookingId
        ? "CLASS_BOOKING"
        : resolveMetadataKind(metadata);
  if (!kind) {
    throw new PermanentStripeEventError(
      "OPERATION_RESOURCE_MISSING",
      "Checkout operation has no supported commerce resource",
    );
  }

  return {
    kind,
    checkoutSessionId: input.session.id,
    operationId: operation.id,
    organizationId: operation.organizationId,
    locationId: operation.locationId,
    stripeConnectionId: connection.id,
    providerAccountId: connection.stripeAccountId,
    clientId: operation.clientId,
    invoiceId: operation.invoiceId,
    bookingId: operation.bookingId,
    studioBookingId: operation.studioBookingId,
    planId: metadataValue(metadata, "planId"),
    pricingOptionId: metadataValue(metadata, "pricingOptionId"),
    amountMinor,
    currency,
    currencyExponent: operation.currencyExponent,
    paymentIntentId,
    customerId: expandableId(input.session.customer),
    subscriptionId: expandableId(input.session.subscription),
    metadata,
  };
}

function resolveMetadataKind(
  metadata: Record<string, string>,
): ResolvedCheckoutKind | null {
  const purchaseType = metadataValue(metadata, "purchaseType");
  if (purchaseType === "GIFT_CARD") return "GIFT_CARD";
  if (purchaseType === "ACCOUNT_CREDIT") return "ACCOUNT_CREDIT";
  if (metadataValue(metadata, "planId")) return "MEMBERSHIP";
  return null;
}
