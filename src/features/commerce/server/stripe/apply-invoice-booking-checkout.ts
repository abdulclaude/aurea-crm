import "server-only";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import {
  booking,
  commerceLedgerEntry,
  invoice,
  invoicePayment,
} from "@/db/schema";
import {
  decimalToMinorUnits,
  minorUnitsToDecimal,
} from "@/features/commerce/lib/money";
import { commerceResourceScopeMatches } from "@/features/commerce/lib/resource-scope";
import {
  openPaymentRecoveryCase,
  resolvePaymentRecoveryCases,
} from "@/features/commerce/server/recovery/payment-recovery-case-service";

import { writeCommerceLedgerEntry } from "../ledger-writer";
import { completeCommerceOperation } from "../operations";
import { PermanentStripeEventError } from "./stripe-event-contract";
import type { CommerceTransaction } from "./stripe-event-receipt";
import type { ResolvedCheckout } from "./resolve-checkout-scope";

export async function applyInvoiceCheckout(input: {
  tx: CommerceTransaction;
  checkout: ResolvedCheckout;
  receiptId: string;
  occurredAt: Date;
}): Promise<void> {
  const { checkout, tx } = input;
  if (!checkout.invoiceId || !checkout.paymentIntentId) {
    throw new PermanentStripeEventError(
      "INVOICE_PAYMENT_REFERENCE_MISSING",
      "Paid invoice checkout is missing its invoice or payment intent",
    );
  }
  if (checkout.amountMinor <= 0) {
    throw new PermanentStripeEventError(
      "INVOICE_PAYMENT_AMOUNT_INVALID",
      "Invoice payment amount must be greater than zero",
    );
  }

  const [selected] = await tx
    .select({
      id: invoice.id,
      organizationId: invoice.organizationId,
      locationId: invoice.locationId,
      clientId: invoice.clientId,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      total: invoice.total,
      currency: invoice.currency,
    })
    .from(invoice)
    .where(eq(invoice.id, checkout.invoiceId))
    .for("update");

  if (
    !selected ||
    !commerceResourceScopeMatches(selected, {
      organizationId: checkout.organizationId,
      locationId: checkout.locationId,
    })
  ) {
    throw new PermanentStripeEventError(
      "INVOICE_SCOPE_MISMATCH",
      "Invoice payment does not belong to the resolved commerce scope",
    );
  }

  const amountDueMinor = decimalToMinorUnits(
    selected.amountDue,
    checkout.currencyExponent,
  );
  if (checkout.amountMinor > amountDueMinor) {
    throw new PermanentStripeEventError(
      "INVOICE_OVERPAYMENT",
      "Stripe payment exceeds the current invoice amount due",
    );
  }

  const ledger = await writeCommerceLedgerEntry(tx, {
    organizationId: checkout.organizationId,
    locationId: checkout.locationId,
    operationId: checkout.operationId,
    provider: "STRIPE",
    stripeConnectionId: checkout.stripeConnectionId,
    providerAccountId: checkout.providerAccountId,
    providerObjectId: checkout.paymentIntentId,
    providerObjectType: "payment_intent",
    kind: "PAYMENT",
    status: "SUCCEEDED",
    paymentIntentId: checkout.paymentIntentId,
    checkoutSessionId: checkout.checkoutSessionId,
    amountMinor: checkout.amountMinor,
    currency: checkout.currency,
    currencyExponent: checkout.currencyExponent,
    clientId: checkout.clientId,
    invoiceId: selected.id,
    stripeEventId: input.receiptId,
    occurredAt: input.occurredAt,
    tenders: [{ type: "STRIPE", amountMinor: checkout.amountMinor }],
  });

  if (!ledger.created) {
    await completeCommerceOperation(tx, checkout.operationId, "SUCCEEDED");
    return;
  }

  const paymentId = randomUUID();
  const paidMinor =
    decimalToMinorUnits(selected.amountPaid, checkout.currencyExponent) +
    checkout.amountMinor;
  const totalMinor = decimalToMinorUnits(selected.total, checkout.currencyExponent);
  const dueMinor = Math.max(0, totalMinor - paidMinor);

  await tx.insert(invoicePayment).values({
    id: paymentId,
    invoiceId: selected.id,
    amount: minorUnitsToDecimal(checkout.amountMinor, checkout.currencyExponent),
    currency: checkout.currency,
    method: "STRIPE",
    paidAt: input.occurredAt,
    stripePaymentId: checkout.paymentIntentId,
    updatedAt: new Date(),
  });

  await Promise.all([
    tx
      .update(invoice)
      .set({
        amountPaid: minorUnitsToDecimal(paidMinor, checkout.currencyExponent),
        amountDue: minorUnitsToDecimal(dueMinor, checkout.currencyExponent),
        status: dueMinor === 0 ? "PAID" : "PARTIALLY_PAID",
        paidAt: dueMinor === 0 ? input.occurredAt : null,
        stripePaymentIntentId: checkout.paymentIntentId,
        updatedAt: new Date(),
      })
      .where(eq(invoice.id, selected.id)),
    tx
      .update(commerceLedgerEntry)
      .set({ invoicePaymentId: paymentId, updatedAt: new Date() })
      .where(eq(commerceLedgerEntry.id, ledger.entry.id)),
  ]);

  await completeCommerceOperation(tx, checkout.operationId, "SUCCEEDED");
  if (dueMinor === 0) {
    await resolvePaymentRecoveryCases({
      tx,
      organizationId: checkout.organizationId,
      locationId: checkout.locationId,
      target: "INVOICE",
      resource: { invoiceId: selected.id },
      sourceEventId: input.receiptId,
      occurredAt: input.occurredAt,
      attemptKey: `stripe:${input.receiptId}:invoice-recovered`,
      provider: "STRIPE",
      providerAccountRef: checkout.providerAccountId,
      stripeConnectionId: checkout.stripeConnectionId,
      providerObjectId: checkout.paymentIntentId,
    });
  }
}

export async function applyBookingCheckout(input: {
  tx: CommerceTransaction;
  checkout: ResolvedCheckout;
  receiptId: string;
  occurredAt: Date;
}): Promise<void> {
  const { checkout, tx } = input;
  if (!checkout.bookingId || !checkout.paymentIntentId) {
    throw new PermanentStripeEventError(
      "BOOKING_PAYMENT_REFERENCE_MISSING",
      "Paid booking checkout is missing its booking or payment intent",
    );
  }

  const [selected] = await tx
    .select({
      id: booking.id,
      organizationId: booking.organizationId,
      locationId: booking.locationId,
      clientId: booking.clientId,
      amount: booking.amount,
      currency: booking.currency,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      holdExpiresAt: booking.holdExpiresAt,
      releasedAt: booking.releasedAt,
    })
    .from(booking)
    .where(eq(booking.id, checkout.bookingId))
    .for("update");

  if (
    !selected ||
    !commerceResourceScopeMatches(selected, {
      organizationId: checkout.organizationId,
      locationId: checkout.locationId,
    })
  ) {
    throw new PermanentStripeEventError(
      "BOOKING_SCOPE_MISMATCH",
      "Booking payment does not belong to the resolved commerce scope",
    );
  }
  if (
    selected.amount &&
    decimalToMinorUnits(selected.amount, checkout.currencyExponent) !==
      checkout.amountMinor
  ) {
    throw new PermanentStripeEventError(
      "BOOKING_AMOUNT_MISMATCH",
      "Stripe payment does not match the booking amount",
    );
  }

  const ledger = await writeCommerceLedgerEntry(tx, {
    organizationId: checkout.organizationId,
    locationId: checkout.locationId,
    operationId: checkout.operationId,
    provider: "STRIPE",
    stripeConnectionId: checkout.stripeConnectionId,
    providerAccountId: checkout.providerAccountId,
    providerObjectId: checkout.paymentIntentId,
    providerObjectType: "payment_intent",
    kind: "PAYMENT",
    status: "SUCCEEDED",
    paymentIntentId: checkout.paymentIntentId,
    checkoutSessionId: checkout.checkoutSessionId,
    amountMinor: checkout.amountMinor,
    currency: checkout.currency,
    currencyExponent: checkout.currencyExponent,
    clientId: checkout.clientId,
    bookingId: selected.id,
    stripeEventId: input.receiptId,
    occurredAt: input.occurredAt,
    tenders: [{ type: "STRIPE", amountMinor: checkout.amountMinor }],
  });

  const latePayment =
    selected.status === "CANCELLED" ||
    selected.paymentStatus === "EXPIRED" ||
    selected.releasedAt !== null ||
    (selected.holdExpiresAt !== null &&
      input.occurredAt > selected.holdExpiresAt);

  if (ledger.created) {
    await tx
      .update(booking)
      .set({
        paid: true,
        status: latePayment ? selected.status : "CONFIRMED",
        paymentStatus: "PAID",
        paymentId: checkout.paymentIntentId,
        amount: minorUnitsToDecimal(checkout.amountMinor, checkout.currencyExponent),
        currency: checkout.currency,
        confirmedAt: latePayment ? null : input.occurredAt,
        holdExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(booking.id, selected.id));
  }

  await completeCommerceOperation(tx, checkout.operationId, "SUCCEEDED");
  if (latePayment) {
    await openPaymentRecoveryCase({
      tx,
      organizationId: checkout.organizationId,
      locationId: checkout.locationId,
      clientId: selected.clientId,
      target: "BOOKING",
      caseKey: `booking:${selected.id}:late-payment:${checkout.paymentIntentId}`,
      bookingId: selected.id,
      sourceEventId: input.receiptId,
      sourceEventAt: input.occurredAt,
      attemptKey: `stripe:${input.receiptId}:booking-late-payment`,
      amountMinor: checkout.amountMinor,
      currency: checkout.currency,
      currencyExponent: checkout.currencyExponent,
      commerceOperationId: checkout.operationId,
      provider: "STRIPE",
      providerAccountRef: checkout.providerAccountId,
      stripeConnectionId: checkout.stripeConnectionId,
      providerObjectId: checkout.paymentIntentId,
      errorCode: "LATE_BOOKING_PAYMENT",
      errorMessage:
        "Payment succeeded after the booking hold was released; operator review is required.",
      operatorReviewOnly: true,
      metadata: { requiresRefundReview: true },
    });
  } else {
    await resolvePaymentRecoveryCases({
      tx,
      organizationId: checkout.organizationId,
      locationId: checkout.locationId,
      target: "BOOKING",
      resource: { bookingId: selected.id },
      sourceEventId: input.receiptId,
      occurredAt: input.occurredAt,
      attemptKey: `stripe:${input.receiptId}:booking-recovered`,
      provider: "STRIPE",
      providerAccountRef: checkout.providerAccountId,
      stripeConnectionId: checkout.stripeConnectionId,
      providerObjectId: checkout.paymentIntentId,
    });
  }
}
