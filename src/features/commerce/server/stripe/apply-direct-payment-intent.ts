import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { cancellationCharge } from "@/db/schema";
import { normalizeCurrency } from "@/features/commerce/lib/money";

import { writeCommerceLedgerEntry } from "../ledger-writer";
import {
  completeCommerceOperation,
  resolveOperationForStripeEvent,
} from "../operations";
import { requireHistoricalStripeConnection } from "./stripe-connection-binding";
import { PermanentStripeEventError } from "./stripe-event-contract";
import { assertPaymentIntentDestination } from "./payment-intent-account-binding";
import type { CommerceTransaction } from "./stripe-event-receipt";
import {
  expandableId,
  metadataValue,
  type StripePaymentIntentObject,
} from "./stripe-object-contracts";

export async function applyDirectPaymentIntentSuccess(input: {
  tx: CommerceTransaction;
  paymentIntent: StripePaymentIntentObject;
  receiptId: string;
  eventAccountId: string | null;
  occurredAt: Date;
}): Promise<{
  organizationId: string;
  locationId: string | null;
  stripeConnectionId: string;
} | null> {
  const operation = await resolveOperationForStripeEvent({
    tx: input.tx,
    operationId: metadataValue(
      input.paymentIntent.metadata,
      "commerceOperationId",
    ),
    paymentIntentId: input.paymentIntent.id,
  });
  if (!operation || operation.type !== "PAYMENT") return null;

  assertPaymentIntentDestination({
    paymentIntent: input.paymentIntent,
    providerAccountId: operation.providerAccountId,
  });

  const currency = normalizeCurrency(input.paymentIntent.currency);
  if (
    operation.amountMinor !== input.paymentIntent.amount ||
    operation.currency !== currency
  ) {
    throw new PermanentStripeEventError(
      "PAYMENT_OPERATION_MISMATCH",
      "Stripe payment does not match its commerce operation",
    );
  }
  const feeMinor = input.paymentIntent.application_fee_amount ?? null;
  if (feeMinor !== null && feeMinor >= input.paymentIntent.amount) {
    throw new PermanentStripeEventError(
      "PAYMENT_APPLICATION_FEE_INVALID",
      "Stripe payment application fee is not lower than the payment amount",
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
  const chargeId = expandableId(input.paymentIntent.latest_charge);

  await writeCommerceLedgerEntry(input.tx, {
    organizationId: operation.organizationId,
    locationId: operation.locationId,
    operationId: operation.id,
    provider: "STRIPE",
    stripeConnectionId: connection.id,
    providerAccountId: connection.stripeAccountId,
    providerObjectId: input.paymentIntent.id,
    providerObjectType: "payment_intent",
    kind: "PAYMENT",
    status: "SUCCEEDED",
    paymentIntentId: input.paymentIntent.id,
    chargeId,
    amountMinor: input.paymentIntent.amount,
    feeMinor,
    netMinor: feeMinor === null ? null : input.paymentIntent.amount - feeMinor,
    currency,
    currencyExponent: operation.currencyExponent,
    clientId: operation.clientId,
    membershipId: operation.membershipId,
    bookingId: operation.bookingId,
    studioBookingId: operation.studioBookingId,
    invoiceId: operation.invoiceId,
    stripeEventId: input.receiptId,
    occurredAt: input.occurredAt,
    tenders: [
      {
        type: "STRIPE",
        amountMinor: input.paymentIntent.amount,
        sourceId: input.paymentIntent.id,
      },
    ],
    metadata: { paymentIntentStatus: input.paymentIntent.status },
  });
  await completeCommerceOperation(input.tx, operation.id, "SUCCEEDED");
  await input.tx
    .update(cancellationCharge)
    .set({
      status: "SUCCEEDED",
      stripePaymentIntentId: input.paymentIntent.id,
      stripeChargeId: chargeId,
      failureCode: null,
      failureMessage: null,
      processedAt: input.occurredAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(cancellationCharge.commerceOperationId, operation.id),
        inArray(cancellationCharge.status, [
          "PENDING",
          "PROCESSING",
          "REQUIRES_PAYMENT_METHOD",
          "FAILED",
        ]),
      ),
    );

  return {
    organizationId: operation.organizationId,
    locationId: operation.locationId,
    stripeConnectionId: connection.id,
  };
}

export async function applyDirectPaymentIntentFailure(input: {
  tx: CommerceTransaction;
  operationId: string;
  paymentIntent: StripePaymentIntentObject;
  occurredAt: Date;
}): Promise<void> {
  await input.tx
    .update(cancellationCharge)
    .set({
      status: "REQUIRES_PAYMENT_METHOD",
      stripePaymentIntentId: input.paymentIntent.id,
      stripeChargeId: expandableId(input.paymentIntent.latest_charge),
      failureCode:
        input.paymentIntent.last_payment_error?.code ?? "STRIPE_PAYMENT_FAILED",
      failureMessage: "The saved payment method could not be charged.",
      processedAt: input.occurredAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(cancellationCharge.commerceOperationId, input.operationId),
        inArray(cancellationCharge.status, ["PENDING", "PROCESSING"]),
      ),
    );
}
