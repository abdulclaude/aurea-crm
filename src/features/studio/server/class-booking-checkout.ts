import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  stripeConnection,
  studioBooking,
  studioClass,
} from "@/db/schema";
import {
  currencyExponent,
  decimalToMinorUnits,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import {
  attachStripeCheckoutToOperation,
  createOrReuseCheckoutOperation,
  failCommerceOperation,
} from "@/features/commerce/server/operations";
import { createStripeCheckoutSessionForClassBooking } from "@/features/bookings/server/stripe-checkout";
import { calculateApplicationFeeMinor } from "@/features/stripe-connect/lib/application-fee";

const MINIMUM_STRIPE_CHECKOUT_LIFETIME_MS = 30 * 60 * 1_000;

export type CreateClassBookingCheckoutInput = {
  organizationId: string;
  locationId: string;
  bookingId: string;
  requestedBy?: string | null;
  successUrl: string;
  cancelUrl: string;
  expectedStripeConnectionId?: string;
  expectedProviderAccountRef?: string;
  operationIdempotencyKey?: string;
  recoveryMetadata?: Record<string, unknown>;
  expectedAmountMinor?: number;
  expectedCurrency?: string;
  expectedCurrencyExponent?: number;
};

export type ClassBookingCheckoutResult = {
  url: string;
  sessionId: string;
  operationId: string;
};

export async function createClassBookingCheckout(
  input: CreateClassBookingCheckoutInput,
): Promise<ClassBookingCheckoutResult> {
  const [selected] = await db
    .select({
      id: studioBooking.id,
      clientId: studioBooking.clientId,
      status: studioBooking.status,
      paymentStatus: studioBooking.paymentStatus,
      amount: studioBooking.amount,
      currency: studioBooking.currency,
      holdExpiresAt: studioBooking.holdExpiresAt,
      className: studioClass.name,
      classStartTime: studioClass.startTime,
      clientName: client.name,
      clientEmail: client.email,
    })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioBooking.classId, studioClass.id))
    .innerJoin(client, eq(studioBooking.clientId, client.id))
    .where(
      and(
        eq(studioBooking.id, input.bookingId),
        eq(studioClass.organizationId, input.organizationId),
        eq(studioClass.locationId, input.locationId),
        eq(client.organizationId, input.organizationId),
        eq(client.locationId, input.locationId),
      ),
    )
    .limit(1);
  if (!selected) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Class booking not found",
    });
  }
  if (selected.status !== "BOOKED" || selected.classStartTime <= new Date()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This class booking can no longer accept payment",
    });
  }
  if (["PAID", "REFUNDED", "NOT_REQUIRED"].includes(selected.paymentStatus)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This class booking does not require another payment",
    });
  }
  if (!selected.amount || !selected.currency || !selected.holdExpiresAt) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Class booking payment details are incomplete",
    });
  }
  if (
    selected.holdExpiresAt.getTime() - Date.now() <
    MINIMUM_STRIPE_CHECKOUT_LIFETIME_MS
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "The class booking payment hold has expired or is too close to expiry",
    });
  }

  const connection = await db.query.stripeConnection.findFirst({
    where: and(
      eq(stripeConnection.organizationId, input.organizationId),
      eq(stripeConnection.locationId, input.locationId),
      input.expectedStripeConnectionId
        ? eq(stripeConnection.id, input.expectedStripeConnectionId)
        : undefined,
      input.expectedProviderAccountRef
        ? eq(stripeConnection.stripeAccountId, input.expectedProviderAccountRef)
        : undefined,
      eq(stripeConnection.isActive, true),
      eq(stripeConnection.chargesEnabled, true),
    ),
  });
  if (!connection || connection.accountType.toLowerCase() !== "express") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Complete Stripe Express onboarding for this location",
    });
  }

  const currency = normalizeCurrency(selected.currency);
  const exponent = currencyExponent(currency);
  const amountMinor = decimalToMinorUnits(selected.amount, exponent);
  if (amountMinor <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid class price",
    });
  }
  if (
    (input.expectedAmountMinor !== undefined &&
      input.expectedAmountMinor !== amountMinor) ||
    (input.expectedCurrency !== undefined &&
      normalizeCurrency(input.expectedCurrency) !== currency) ||
    (input.expectedCurrencyExponent !== undefined &&
      input.expectedCurrencyExponent !== exponent)
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Recovery checkout values no longer match the class booking",
    });
  }
  const applicationFeeAmount = calculateApplicationFeeMinor({
    amountMinor,
    currencyExponent: exponent,
    percent: connection.applicationFeePercent,
    fixed: connection.applicationFeeFixed,
  });
  const operation = await createOrReuseCheckoutOperation({
    organizationId: input.organizationId,
    locationId: input.locationId,
    clientId: selected.clientId,
    stripeConnectionId: connection.id,
    providerAccountId: connection.stripeAccountId,
    idempotencyKey:
      input.operationIdempotencyKey ?? `stripe:class-booking:${selected.id}`,
    amountMinor,
    currency,
    currencyExponent: exponent,
    studioBookingId: selected.id,
    requestedBy: input.requestedBy,
    expiresAt: selected.holdExpiresAt,
    metadata: {
      checkoutKind: "CLASS_BOOKING",
      ...(input.recoveryMetadata ?? {}),
    },
  });
  const existingUrl = metadataString(operation.metadata, "checkoutUrl");
  if (operation.providerCheckoutSessionId && existingUrl) {
    return {
      url: existingUrl,
      sessionId: operation.providerCheckoutSessionId,
      operationId: operation.id,
    };
  }

  const session = await createStripeCheckoutSessionForClassBooking({
    studioBookingId: selected.id,
    organizationId: input.organizationId,
    locationId: input.locationId,
    clientId: selected.clientId,
    commerceOperationId: operation.id,
    stripeConnectionId: connection.id,
    idempotencyKey: `aurea_class_checkout_${operation.id}`,
    bookingTitle: selected.className,
    amount: amountMinor,
    currency,
    attendeeEmail: selected.clientEmail,
    attendeeName: selected.clientName,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    expiresAt: selected.holdExpiresAt,
    stripeAccountId: connection.stripeAccountId,
    stripeAccountType: connection.accountType,
    applicationFeeAmount,
  });
  if (!session.success) {
    await Promise.all([
      failCommerceOperation({
        operationId: operation.id,
        code: "STRIPE_CHECKOUT_CREATE_FAILED",
        message: session.error,
      }),
      db
        .update(studioBooking)
        .set({
          paymentStatus: "FAILED",
          paymentFailureAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(studioBooking.id, selected.id)),
    ]);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: session.error,
    });
  }

  await attachStripeCheckoutToOperation({
    operationId: operation.id,
    checkoutSessionId: session.sessionId,
    paymentIntentId: session.paymentIntentId,
    checkoutUrl: session.url,
  });
  await db
    .update(studioBooking)
    .set({ paymentStatus: "PROCESSING", updatedAt: new Date() })
    .where(
      and(
        eq(studioBooking.id, selected.id),
        eq(studioBooking.paymentStatus, "REQUIRES_PAYMENT"),
      ),
    );
  return {
    url: session.url,
    sessionId: session.sessionId,
    operationId: operation.id,
  };
}

function metadataString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = Reflect.get(value, key);
  return typeof entry === "string" ? entry : null;
}
