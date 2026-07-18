import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  booking,
  client,
  paymentRecoveryLink,
  stripeConnection,
  studioMembership,
} from "@/db/schema";
import { createStripeCheckoutSessionForBooking } from "@/features/bookings/server/stripe-checkout";
import {
  decimalToMinorUnits,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import {
  attachStripeCheckoutToOperation,
  createOrReuseCheckoutOperation,
  failCommerceOperation,
} from "@/features/commerce/server/operations";
import {
  buildPublicInvoiceUrl,
  issueInvoiceAccessToken,
} from "@/features/invoicing/server/invoice-access-tokens";
import { calculateApplicationFeeMinor } from "@/features/stripe-connect/lib/application-fee";
import { getStripePlatformClient } from "@/lib/stripe";
import { createClassBookingCheckout } from "@/features/studio/server/class-booking-checkout";

import { getPaymentRecoveryLink } from "./payment-recovery-link-service";

export type PaymentRecoveryPublicSummary = {
  target: "INVOICE" | "MEMBERSHIP" | "BOOKING";
  status: "ACTIONABLE" | "RESOLVED" | "UNAVAILABLE";
  amountMinor: number;
  currency: string;
  currencyExponent: number;
  expiresAt: Date;
};

export class PaymentRecoveryPublicError extends Error {
  constructor(
    readonly code:
      | "INVALID_LINK"
      | "ALREADY_RESOLVED"
      | "TARGET_UNAVAILABLE"
      | "PROVIDER_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "PaymentRecoveryPublicError";
  }
}

export async function getPaymentRecoveryPublicSummary(
  token: string,
): Promise<PaymentRecoveryPublicSummary> {
  const recovery = await getPaymentRecoveryLink(token);
  if (!recovery) {
    throw new PaymentRecoveryPublicError(
      "INVALID_LINK",
      "This recovery link is invalid or has expired.",
    );
  }

  return {
    target: recovery.target,
    status:
      recovery.status === "RECOVERED"
        ? "RESOLVED"
        : recovery.status === "CANCELLED"
          ? "UNAVAILABLE"
          : "ACTIONABLE",
    amountMinor: recovery.amountMinor,
    currency: recovery.currency,
    currencyExponent: recovery.currencyExponent,
    expiresAt: recovery.expiresAt,
  };
}

export async function createPaymentRecoveryDestination(
  token: string,
): Promise<string> {
  const recovery = await getPaymentRecoveryLink(token);
  if (!recovery) {
    throw new PaymentRecoveryPublicError(
      "INVALID_LINK",
      "This recovery link is invalid or has expired.",
    );
  }
  if (recovery.status === "RECOVERED") {
    throw new PaymentRecoveryPublicError(
      "ALREADY_RESOLVED",
      "This payment has already been resolved.",
    );
  }
  if (recovery.status === "CANCELLED") {
    throw new PaymentRecoveryPublicError(
      "TARGET_UNAVAILABLE",
      "This payment recovery case is no longer available.",
    );
  }

  let destination: string;
  if (recovery.target === "INVOICE" && recovery.invoiceId) {
    destination = await createInvoiceRecoveryDestination(recovery);
  } else if (recovery.target === "MEMBERSHIP" && recovery.membershipId) {
    destination = await createMembershipRecoveryDestination(token, recovery);
  } else if (recovery.target === "BOOKING" && recovery.bookingId) {
    destination = await createBookingRecoveryDestination(token, recovery);
  } else if (recovery.target === "BOOKING" && recovery.studioBookingId) {
    destination = await createClassBookingRecoveryDestination(token, recovery);
  } else {
    throw new PaymentRecoveryPublicError(
      "TARGET_UNAVAILABLE",
      "A secure payment route is not available for this recovery case.",
    );
  }

  await db
    .update(paymentRecoveryLink)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(paymentRecoveryLink.id, recovery.linkId),
        eq(paymentRecoveryLink.organizationId, recovery.organizationId),
        recovery.locationId
          ? eq(paymentRecoveryLink.locationId, recovery.locationId)
          : isNull(paymentRecoveryLink.locationId),
      ),
    );
  return destination;
}

async function createClassBookingRecoveryDestination(
  recoveryToken: string,
  recovery: RecoveryLink,
): Promise<string> {
  if (
    !recovery.studioBookingId ||
    !recovery.locationId ||
    !recovery.stripeConnectionId ||
    !recovery.providerAccountRef
  ) {
    throw new PaymentRecoveryPublicError(
      "TARGET_UNAVAILABLE",
      "The class booking payment account is no longer available.",
    );
  }
  const recoveryUrl = `${publicAppUrl()}/recover-payment/${encodeURIComponent(recoveryToken)}`;
  try {
    const checkout = await createClassBookingCheckout({
      organizationId: recovery.organizationId,
      locationId: recovery.locationId,
      bookingId: recovery.studioBookingId,
      successUrl: `${recoveryUrl}?payment=processing`,
      cancelUrl: recoveryUrl,
      expectedStripeConnectionId: recovery.stripeConnectionId,
      expectedProviderAccountRef: recovery.providerAccountRef,
      expectedAmountMinor: recovery.amountMinor,
      expectedCurrency: recovery.currency,
      expectedCurrencyExponent: recovery.currencyExponent,
      operationIdempotencyKey: `stripe:class-booking-recovery:${recovery.caseId}:${recovery.linkId}`,
      recoveryMetadata: {
        recoveryCaseId: recovery.caseId,
        recoveryLinkId: recovery.linkId,
      },
    });
    return checkout.url;
  } catch (error: unknown) {
    if (
      error instanceof PaymentRecoveryPublicError &&
      error.code === "TARGET_UNAVAILABLE"
    ) {
      throw error;
    }
    console.error("[payment-recovery.public] Class checkout creation failed", {
      organizationId: recovery.organizationId,
      locationId: recovery.locationId,
      caseId: recovery.caseId,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    throw new PaymentRecoveryPublicError(
      "PROVIDER_UNAVAILABLE",
      "Secure checkout is temporarily unavailable.",
    );
  }
}

type RecoveryLink = NonNullable<
  Awaited<ReturnType<typeof getPaymentRecoveryLink>>
>;

async function createInvoiceRecoveryDestination(
  recovery: RecoveryLink,
): Promise<string> {
  if (!recovery.invoiceId) {
    throw new PaymentRecoveryPublicError(
      "TARGET_UNAVAILABLE",
      "The invoice is no longer available.",
    );
  }
  const access = await issueInvoiceAccessToken({
    invoiceId: recovery.invoiceId,
    organizationId: recovery.organizationId,
    locationId: recovery.locationId,
    purpose: "PAY",
    createdBy: null,
  });
  return buildPublicInvoiceUrl({
    baseUrl: publicAppUrl(),
    token: access.token,
    purpose: "PAY",
  });
}

async function createBookingRecoveryDestination(
  recoveryToken: string,
  recovery: RecoveryLink,
): Promise<string> {
  if (
    !recovery.bookingId ||
    !recovery.locationId ||
    !recovery.stripeConnectionId ||
    !recovery.providerAccountRef
  ) {
    throw new PaymentRecoveryPublicError(
      "TARGET_UNAVAILABLE",
      "The booking payment account is no longer available.",
    );
  }

  const [binding] = await db
    .select({
      id: booking.id,
      clientId: booking.clientId,
      title: booking.title,
      attendeeName: booking.attendeeName,
      attendeeEmail: booking.attendeeEmail,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      amount: booking.amount,
      currency: booking.currency,
      holdExpiresAt: booking.holdExpiresAt,
      stripeConnectionId: stripeConnection.id,
      stripeAccountId: stripeConnection.stripeAccountId,
      accountType: stripeConnection.accountType,
      applicationFeePercent: stripeConnection.applicationFeePercent,
      applicationFeeFixed: stripeConnection.applicationFeeFixed,
    })
    .from(booking)
    .innerJoin(
      stripeConnection,
      eq(stripeConnection.id, recovery.stripeConnectionId),
    )
    .where(
      and(
        eq(booking.id, recovery.bookingId),
        eq(booking.organizationId, recovery.organizationId),
        eq(booking.locationId, recovery.locationId),
        eq(stripeConnection.organizationId, recovery.organizationId),
        eq(stripeConnection.locationId, recovery.locationId),
        eq(stripeConnection.stripeAccountId, recovery.providerAccountRef),
        eq(stripeConnection.isActive, true),
        eq(stripeConnection.chargesEnabled, true),
      ),
    )
    .limit(1);

  const expiresAt = binding?.holdExpiresAt
    ? new Date(
        Math.min(binding.holdExpiresAt.getTime(), recovery.expiresAt.getTime()),
      )
    : recovery.expiresAt;
  if (
    !binding ||
    !["PENDING", "CONFIRMED"].includes(binding.status) ||
    ["PAID", "REFUNDED", "EXPIRED"].includes(binding.paymentStatus) ||
    !binding.amount ||
    !binding.currency ||
    normalizeCurrency(binding.currency) !== recovery.currency ||
    decimalToMinorUnits(binding.amount, recovery.currencyExponent) !==
      recovery.amountMinor ||
    expiresAt.getTime() - Date.now() < 30 * 60 * 1_000 ||
    binding.accountType.toLowerCase() !== "express"
  ) {
    throw new PaymentRecoveryPublicError(
      "TARGET_UNAVAILABLE",
      "This booking can no longer accept payment.",
    );
  }

  const operation = await createOrReuseCheckoutOperation({
    organizationId: recovery.organizationId,
    locationId: recovery.locationId,
    clientId: binding.clientId,
    stripeConnectionId: binding.stripeConnectionId,
    providerAccountId: binding.stripeAccountId,
    idempotencyKey: `stripe:booking-recovery:${recovery.caseId}:${recovery.linkId}`,
    amountMinor: recovery.amountMinor,
    currency: recovery.currency,
    currencyExponent: recovery.currencyExponent,
    bookingId: binding.id,
    expiresAt,
    metadata: {
      checkoutKind: "BOOKING",
      recoveryCaseId: recovery.caseId,
      recoveryLinkId: recovery.linkId,
    },
  });
  const existingUrl = metadataString(operation.metadata, "checkoutUrl");
  if (operation.providerCheckoutSessionId && existingUrl) return existingUrl;

  const applicationFeeAmount = calculateApplicationFeeMinor({
    amountMinor: recovery.amountMinor,
    currencyExponent: recovery.currencyExponent,
    percent: binding.applicationFeePercent,
    fixed: binding.applicationFeeFixed,
  });
  const recoveryUrl = `${publicAppUrl()}/recover-payment/${encodeURIComponent(recoveryToken)}`;
  const session = await createStripeCheckoutSessionForBooking({
    bookingId: binding.id,
    organizationId: recovery.organizationId,
    locationId: recovery.locationId,
    clientId: binding.clientId,
    commerceOperationId: operation.id,
    stripeConnectionId: binding.stripeConnectionId,
    idempotencyKey: `aurea_recovery_checkout_${operation.id}`,
    bookingTitle: binding.title,
    amount: recovery.amountMinor,
    currency: recovery.currency,
    attendeeEmail: binding.attendeeEmail,
    attendeeName: binding.attendeeName,
    successUrl: `${recoveryUrl}?payment=processing`,
    cancelUrl: recoveryUrl,
    expiresAt,
    stripeAccountId: binding.stripeAccountId,
    stripeAccountType: binding.accountType,
    applicationFeeAmount,
  });
  if (!session.success) {
    await failCommerceOperation({
      operationId: operation.id,
      code: "STRIPE_CHECKOUT_CREATE_FAILED",
      message: session.error,
    });
    await db
      .update(booking)
      .set({
        paymentStatus: "FAILED",
        paymentFailureAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(booking.id, binding.id),
          eq(booking.organizationId, recovery.organizationId),
          eq(booking.locationId, recovery.locationId),
        ),
      );
    throw new PaymentRecoveryPublicError(
      "PROVIDER_UNAVAILABLE",
      "Secure checkout is temporarily unavailable.",
    );
  }

  await attachStripeCheckoutToOperation({
    operationId: operation.id,
    checkoutSessionId: session.sessionId,
    paymentIntentId: session.paymentIntentId,
    checkoutUrl: session.url,
  });
  await db
    .update(booking)
    .set({ paymentStatus: "PROCESSING", updatedAt: new Date() })
    .where(
      and(
        eq(booking.id, binding.id),
        eq(booking.organizationId, recovery.organizationId),
        eq(booking.locationId, recovery.locationId),
      ),
    );
  return session.url;
}

async function createMembershipRecoveryDestination(
  recoveryToken: string,
  recovery: RecoveryLink,
): Promise<string> {
  if (
    !recovery.membershipId ||
    !recovery.stripeConnectionId ||
    !recovery.providerAccountRef
  ) {
    throw new PaymentRecoveryPublicError(
      "TARGET_UNAVAILABLE",
      "The membership payment account is no longer available.",
    );
  }

  const locationCondition = recovery.locationId
    ? eq(studioMembership.locationId, recovery.locationId)
    : isNull(studioMembership.locationId);
  const connectionLocationCondition = recovery.locationId
    ? eq(stripeConnection.locationId, recovery.locationId)
    : isNull(stripeConnection.locationId);
  const clientLocationCondition = recovery.locationId
    ? eq(client.locationId, recovery.locationId)
    : isNull(client.locationId);
  const [binding] = await db
    .select({
      customerId: client.stripeCustomerId,
      subscriptionId: studioMembership.stripeSubscriptionId,
      stripeAccountId: stripeConnection.stripeAccountId,
      accountType: stripeConnection.accountType,
    })
    .from(studioMembership)
    .innerJoin(client, eq(client.id, studioMembership.clientId))
    .innerJoin(
      stripeConnection,
      eq(stripeConnection.id, studioMembership.stripeConnectionId),
    )
    .where(
      and(
        eq(studioMembership.id, recovery.membershipId),
        eq(studioMembership.organizationId, recovery.organizationId),
        locationCondition,
        eq(client.organizationId, recovery.organizationId),
        clientLocationCondition,
        eq(stripeConnection.id, recovery.stripeConnectionId),
        eq(stripeConnection.organizationId, recovery.organizationId),
        connectionLocationCondition,
        eq(stripeConnection.stripeAccountId, recovery.providerAccountRef),
      ),
    )
    .limit(1);

  if (
    !binding?.customerId ||
    !binding.subscriptionId ||
    binding.accountType.toLowerCase() !== "express" ||
    binding.stripeAccountId !== recovery.providerAccountRef
  ) {
    throw new PaymentRecoveryPublicError(
      "TARGET_UNAVAILABLE",
      "The membership payment account is no longer available.",
    );
  }

  try {
    const portal =
      await getStripePlatformClient().billingPortal.sessions.create({
        customer: binding.customerId,
        return_url: `${publicAppUrl()}/recover-payment/${encodeURIComponent(recoveryToken)}`,
      });
    return portal.url;
  } catch (error: unknown) {
    console.error("[payment-recovery.public] Billing portal creation failed", {
      organizationId: recovery.organizationId,
      locationId: recovery.locationId,
      caseId: recovery.caseId,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    throw new PaymentRecoveryPublicError(
      "PROVIDER_UNAVAILABLE",
      "Secure billing is temporarily unavailable.",
    );
  }
}

function publicAppUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function metadataString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : null;
}
