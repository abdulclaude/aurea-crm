import "server-only";

import { randomUUID } from "crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  booking,
  invoice,
  paymentRecoveryAction,
  studioBooking,
  studioClass,
} from "@/db/schema";
import { openPaymentRecoveryCase } from "@/features/commerce/server/recovery/payment-recovery-case-service";
import {
  reserveWaitlistOfferForReleasedSeat,
  type WaitlistOffer,
} from "@/features/studio/server/waitlist-offer-service";

import { completeCommerceOperation } from "../operations";
import type { ResolvedCheckout } from "./resolve-checkout-scope";
import { PermanentStripeEventError } from "./stripe-event-contract";
import type { CommerceTransaction } from "./stripe-event-receipt";

export async function applyCheckoutFailure(input: {
  tx: CommerceTransaction;
  checkout: ResolvedCheckout;
  receiptId: string;
  occurredAt: Date;
  kind: "EXPIRED" | "ASYNC_FAILED";
}): Promise<WaitlistOffer | null> {
  await completeCommerceOperation(
    input.tx,
    input.checkout.operationId,
    input.kind === "EXPIRED" ? "CANCELLED" : "FAILED",
    input.kind === "ASYNC_FAILED"
      ? {
          code: "STRIPE_ASYNC_PAYMENT_FAILED",
          message: "Stripe reported that the asynchronous payment failed",
        }
      : {
          code: "STRIPE_CHECKOUT_EXPIRED",
          message: "Stripe checkout expired before payment completed",
        },
  );

  if (input.checkout.kind === "BOOKING") {
    await applyBookingFailure(input);
    return null;
  }
  if (input.checkout.kind === "CLASS_BOOKING") {
    return applyClassBookingFailure(input);
  }
  if (input.checkout.kind === "INVOICE") {
    await applyInvoiceFailure(input);
  }
  return null;
}

async function applyClassBookingFailure(input: {
  tx: CommerceTransaction;
  checkout: ResolvedCheckout;
  receiptId: string;
  occurredAt: Date;
  kind: "EXPIRED" | "ASYNC_FAILED";
}): Promise<WaitlistOffer | null> {
  const locationId = input.checkout.locationId;
  if (!input.checkout.studioBookingId || !locationId) {
    throw new PermanentStripeEventError(
      "CLASS_BOOKING_PAYMENT_REFERENCE_MISSING",
      "Failed class checkout is missing its booking reference",
    );
  }
  const [selected] = await input.tx
    .select({
      id: studioBooking.id,
      classId: studioBooking.classId,
      clientId: studioBooking.clientId,
      status: studioBooking.status,
      paymentStatus: studioBooking.paymentStatus,
      organizationId: studioClass.organizationId,
      locationId: studioClass.locationId,
    })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioBooking.classId, studioClass.id))
    .where(eq(studioBooking.id, input.checkout.studioBookingId))
    .limit(1)
    .for("update");
  if (
    !selected ||
    selected.organizationId !== input.checkout.organizationId ||
    selected.locationId !== locationId ||
    selected.status !== "BOOKED" ||
    !["REQUIRES_PAYMENT", "PROCESSING"].includes(selected.paymentStatus)
  ) {
    return null;
  }

  const terminal = input.kind === "EXPIRED";
  await input.tx
    .update(studioBooking)
    .set({
      status: terminal ? "CANCELLED" : "BOOKED",
      paymentStatus: terminal ? "EXPIRED" : "FAILED",
      paymentFailureAt: input.occurredAt,
      cancelledAt: terminal ? input.occurredAt : null,
      cancellationReason: terminal ? "Payment checkout expired" : null,
      releasedAt: terminal ? input.occurredAt : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(studioBooking.id, selected.id),
        eq(studioBooking.status, "BOOKED"),
        inArray(studioBooking.paymentStatus, [
          "REQUIRES_PAYMENT",
          "PROCESSING",
        ]),
      ),
    );
  const waitlistOffer = terminal
    ? await reserveWaitlistOfferForReleasedSeat({
        tx: input.tx,
        organizationId: input.checkout.organizationId,
        locationId,
        classId: selected.classId,
        now: input.occurredAt,
      })
    : null;
  const recovery = await openPaymentRecoveryCase({
    tx: input.tx,
    organizationId: input.checkout.organizationId,
    locationId,
    clientId: selected.clientId,
    target: "BOOKING",
    caseKey: `class-booking:${selected.id}`,
    studioBookingId: selected.id,
    sourceEventId: input.receiptId,
    sourceEventAt: input.occurredAt,
    attemptKey: `stripe:${input.receiptId}:class-booking-failure`,
    amountMinor: input.checkout.amountMinor,
    currency: input.checkout.currency,
    currencyExponent: input.checkout.currencyExponent,
    commerceOperationId: input.checkout.operationId,
    provider: "STRIPE",
    providerAccountRef: input.checkout.providerAccountId,
    stripeConnectionId: input.checkout.stripeConnectionId,
    providerObjectId: input.checkout.checkoutSessionId,
    errorCode: terminal
      ? "STRIPE_CHECKOUT_EXPIRED"
      : "STRIPE_ASYNC_PAYMENT_FAILED",
    errorMessage: terminal
      ? "Class payment checkout expired before completion"
      : "Stripe reported an asynchronous class payment failure",
  });
  if (terminal) {
    await input.tx
      .insert(paymentRecoveryAction)
      .values({
        id: randomUUID(),
        organizationId: input.checkout.organizationId,
        locationId: input.checkout.locationId,
        caseId: recovery.caseId,
        type: "RELEASE_BOOKING",
        status: "SCHEDULED",
        sequence: 100,
        idempotencyKey: `recovery:${recovery.caseId}:release-class-booking`,
        scheduledAt: input.occurredAt,
        availableAt: input.occurredAt,
        maxAttempts: 5,
        payload: { studioBookingId: selected.id },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: paymentRecoveryAction.idempotencyKey });
  }
  return waitlistOffer;
}

async function applyBookingFailure(input: {
  tx: CommerceTransaction;
  checkout: ResolvedCheckout;
  receiptId: string;
  occurredAt: Date;
  kind: "EXPIRED" | "ASYNC_FAILED";
}): Promise<void> {
  if (!input.checkout.bookingId) {
    throw new PermanentStripeEventError(
      "BOOKING_PAYMENT_REFERENCE_MISSING",
      "Failed booking checkout is missing its booking reference",
    );
  }
  const [selected] = await input.tx
    .select({
      id: booking.id,
      organizationId: booking.organizationId,
      locationId: booking.locationId,
      clientId: booking.clientId,
      paymentStatus: booking.paymentStatus,
      paid: booking.paid,
    })
    .from(booking)
    .where(
      and(
        eq(booking.id, input.checkout.bookingId),
        eq(booking.organizationId, input.checkout.organizationId),
        input.checkout.locationId
          ? eq(booking.locationId, input.checkout.locationId)
          : isNull(booking.locationId),
      ),
    )
    .for("update");
  if (!selected || selected.paid || selected.paymentStatus === "PAID") return;

  const terminal = input.kind === "EXPIRED";
  await input.tx
    .update(booking)
    .set({
      status: terminal ? "CANCELLED" : "PENDING",
      paymentStatus: terminal ? "EXPIRED" : "FAILED",
      paymentFailureAt: input.occurredAt,
      cancelledAt: terminal ? input.occurredAt : null,
      cancellationReason: terminal ? "Payment checkout expired" : null,
      releasedAt: terminal ? input.occurredAt : null,
      updatedAt: new Date(),
    })
    .where(eq(booking.id, selected.id));

  const recovery = await openPaymentRecoveryCase({
    tx: input.tx,
    organizationId: input.checkout.organizationId,
    locationId: input.checkout.locationId,
    clientId: selected.clientId,
    target: "BOOKING",
    caseKey: `booking:${selected.id}`,
    bookingId: selected.id,
    sourceEventId: input.receiptId,
    sourceEventAt: input.occurredAt,
    attemptKey: `stripe:${input.receiptId}:booking-failure`,
    amountMinor: input.checkout.amountMinor,
    currency: input.checkout.currency,
    currencyExponent: input.checkout.currencyExponent,
    commerceOperationId: input.checkout.operationId,
    provider: "STRIPE",
    providerAccountRef: input.checkout.providerAccountId,
    stripeConnectionId: input.checkout.stripeConnectionId,
    providerObjectId: input.checkout.checkoutSessionId,
    errorCode:
      input.kind === "EXPIRED"
        ? "STRIPE_CHECKOUT_EXPIRED"
        : "STRIPE_ASYNC_PAYMENT_FAILED",
    errorMessage:
      input.kind === "EXPIRED"
        ? "Payment checkout expired before completion"
        : "Stripe reported an asynchronous payment failure",
  });
  if (terminal) {
    await input.tx
      .insert(paymentRecoveryAction)
      .values({
        id: randomUUID(),
        organizationId: input.checkout.organizationId,
        locationId: input.checkout.locationId,
        caseId: recovery.caseId,
        type: "RELEASE_BOOKING",
        status: "SCHEDULED",
        sequence: 100,
        idempotencyKey: `recovery:${recovery.caseId}:release-booking`,
        scheduledAt: input.occurredAt,
        availableAt: input.occurredAt,
        maxAttempts: 5,
        payload: { bookingId: selected.id },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: paymentRecoveryAction.idempotencyKey });
  }
}

async function applyInvoiceFailure(input: {
  tx: CommerceTransaction;
  checkout: ResolvedCheckout;
  receiptId: string;
  occurredAt: Date;
  kind: "EXPIRED" | "ASYNC_FAILED";
}): Promise<void> {
  if (!input.checkout.invoiceId) return;
  const [selected] = await input.tx
    .select({
      id: invoice.id,
      organizationId: invoice.organizationId,
      locationId: invoice.locationId,
      clientId: invoice.clientId,
      status: invoice.status,
    })
    .from(invoice)
    .where(
      and(
        eq(invoice.id, input.checkout.invoiceId),
        eq(invoice.organizationId, input.checkout.organizationId),
        input.checkout.locationId
          ? eq(invoice.locationId, input.checkout.locationId)
          : isNull(invoice.locationId),
      ),
    )
    .for("update");
  if (!selected || selected.status === "PAID") return;

  await openPaymentRecoveryCase({
    tx: input.tx,
    organizationId: input.checkout.organizationId,
    locationId: input.checkout.locationId,
    clientId: selected.clientId,
    target: "INVOICE",
    caseKey: `invoice:${selected.id}`,
    invoiceId: selected.id,
    sourceEventId: input.receiptId,
    sourceEventAt: input.occurredAt,
    attemptKey: `stripe:${input.receiptId}:invoice-failure`,
    amountMinor: input.checkout.amountMinor,
    currency: input.checkout.currency,
    currencyExponent: input.checkout.currencyExponent,
    commerceOperationId: input.checkout.operationId,
    provider: "STRIPE",
    providerAccountRef: input.checkout.providerAccountId,
    stripeConnectionId: input.checkout.stripeConnectionId,
    providerObjectId: input.checkout.checkoutSessionId,
    errorCode:
      input.kind === "EXPIRED"
        ? "STRIPE_CHECKOUT_EXPIRED"
        : "STRIPE_ASYNC_PAYMENT_FAILED",
    errorMessage:
      input.kind === "EXPIRED"
        ? "Invoice checkout expired before completion"
        : "Stripe reported an asynchronous invoice payment failure",
  });
}
