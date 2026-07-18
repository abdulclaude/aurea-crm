import "server-only";

import type Stripe from "stripe";

import {
  assertExpressDestinationAccount,
  buildDestinationChargePaymentData,
} from "@/features/stripe-connect/lib/destination-charge";
import { getStripePlatformClient } from "@/lib/stripe";

export type CreateBookingCheckoutInput = {
  bookingId: string;
  organizationId: string;
  locationId: string;
  clientId: string | null;
  commerceOperationId: string;
  stripeConnectionId: string;
  idempotencyKey: string;
  bookingTitle: string;
  amount: number;
  currency: string;
  attendeeEmail: string;
  attendeeName: string;
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
  stripeAccountId: string;
  stripeAccountType: string;
  applicationFeeAmount?: number;
};

export type BookingCheckoutResult =
  | {
      success: true;
      sessionId: string;
      url: string;
      paymentIntentId: string | null;
    }
  | { success: false; error: string };

export type CreateClassBookingCheckoutInput = Omit<
  CreateBookingCheckoutInput,
  "bookingId" | "attendeeName" | "attendeeEmail"
> & {
  studioBookingId: string;
  attendeeName: string;
  attendeeEmail: string | null;
};

export async function createStripeCheckoutSessionForBooking(
  input: CreateBookingCheckoutInput,
): Promise<BookingCheckoutResult> {
  try {
    assertExpressDestinationAccount(input.stripeAccountType);
    const metadata = bookingCheckoutMetadata(input);
    const stripe = getStripePlatformClient();
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [bookingLineItem(input)],
        mode: "payment",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        expires_at: Math.floor(input.expiresAt.getTime() / 1_000),
        customer_email: input.attendeeEmail,
        metadata: { ...metadata, attendeeName: input.attendeeName },
        payment_intent_data: buildDestinationChargePaymentData({
          destinationAccountId: input.stripeAccountId,
          metadata,
          applicationFeeAmount: input.applicationFeeAmount,
        }),
      },
      { idempotencyKey: input.idempotencyKey },
    );

    if (!session.url) {
      return { success: false, error: "Stripe did not return a checkout URL" };
    }

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
      paymentIntentId: stripeObjectId(session.payment_intent),
    };
  } catch (error: unknown) {
    console.error("[bookings.stripe-checkout] Checkout creation failed", {
      organizationId: input.organizationId,
      locationId: input.locationId,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false,
      error: "Failed to create booking payment session",
    };
  }
}

export async function createStripeCheckoutSessionForClassBooking(
  input: CreateClassBookingCheckoutInput,
): Promise<BookingCheckoutResult> {
  try {
    assertExpressDestinationAccount(input.stripeAccountType);
    const metadata: Stripe.MetadataParam = {
      studioBookingId: input.studioBookingId,
      organizationId: input.organizationId,
      locationId: input.locationId,
      commerceOperationId: input.commerceOperationId,
      stripeConnectionId: input.stripeConnectionId,
      checkoutKind: "CLASS_BOOKING",
      ...(input.clientId ? { clientId: input.clientId } : {}),
    };
    const stripe = getStripePlatformClient();
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [bookingLineItem(input)],
        mode: "payment",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        expires_at: Math.floor(input.expiresAt.getTime() / 1_000),
        ...(input.attendeeEmail ? { customer_email: input.attendeeEmail } : {}),
        metadata: { ...metadata, attendeeName: input.attendeeName },
        payment_intent_data: buildDestinationChargePaymentData({
          destinationAccountId: input.stripeAccountId,
          metadata,
          applicationFeeAmount: input.applicationFeeAmount,
        }),
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (!session.url) {
      return { success: false, error: "Stripe did not return a checkout URL" };
    }
    return {
      success: true,
      sessionId: session.id,
      url: session.url,
      paymentIntentId: stripeObjectId(session.payment_intent),
    };
  } catch (error: unknown) {
    console.error("[studio.class-booking.checkout] Checkout creation failed", {
      organizationId: input.organizationId,
      locationId: input.locationId,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, error: "Failed to create class payment session" };
  }
}

function bookingCheckoutMetadata(
  input: CreateBookingCheckoutInput,
): Stripe.MetadataParam {
  return {
    bookingId: input.bookingId,
    organizationId: input.organizationId,
    locationId: input.locationId,
    commerceOperationId: input.commerceOperationId,
    stripeConnectionId: input.stripeConnectionId,
    ...(input.clientId ? { clientId: input.clientId } : {}),
  };
}

function bookingLineItem(
  input: Pick<
    CreateBookingCheckoutInput,
    "bookingTitle" | "amount" | "currency"
  >,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    price_data: {
      currency: input.currency.toLowerCase(),
      product_data: {
        name: input.bookingTitle,
        description: "Booking payment",
      },
      unit_amount: input.amount,
    },
    quantity: 1,
  };
}

function stripeObjectId(
  value: string | Stripe.PaymentIntent | null,
): string | null {
  return typeof value === "string" ? value : (value?.id ?? null);
}
