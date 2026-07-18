import "server-only";

import Stripe from "stripe";

import { calculateApplicationFeeMinor } from "@/features/stripe-connect/lib/application-fee";
import { getStripePlatformClient } from "@/lib/stripe";

import { reserveCancellationCollection } from "./cancellation-collection-reservation";
import {
  markCancellationCollectionFailure,
  markCancellationPaymentMethodRequired,
  recordCancellationPaymentIntent,
} from "./cancellation-collection-state";
import type { CancellationCollectionResult } from "./cancellation-collection-types";
import { classifyPermanentCancellationStripeError } from "./cancellation-stripe-error";
import { resolveCancellationPaymentMethod } from "./cancellation-stripe-customer";

export type { CancellationCollectionResult } from "./cancellation-collection-types";

export async function collectCancellationCharge(
  chargeId: string,
): Promise<CancellationCollectionResult> {
  const reservation = await reserveCancellationCollection(chargeId);
  if ("terminalStatus" in reservation) {
    return {
      chargeId,
      status: reservation.terminalStatus,
      paymentIntentId: null,
    };
  }

  if (!reservation.stripeCustomerId) {
    return markCancellationPaymentMethodRequired(
      reservation,
      "CUSTOMER_NOT_LINKED",
    );
  }

  const stripe = getStripePlatformClient();
  let paymentMethodId: string | null;
  try {
    paymentMethodId = await resolveCancellationPaymentMethod(
      stripe,
      reservation.stripeCustomerId,
    );
  } catch (error) {
    if (isMissingStripeCustomer(error)) {
      return markCancellationPaymentMethodRequired(
        reservation,
        "CUSTOMER_NOT_FOUND",
      );
    }
    const permanentFailure = classifyPermanentCancellationStripeError(error);
    if (!permanentFailure) throw error;
    await markCancellationCollectionFailure(reservation, permanentFailure);
    return { chargeId, status: "FAILED", paymentIntentId: null };
  }
  if (!paymentMethodId) {
    return markCancellationPaymentMethodRequired(
      reservation,
      "PAYMENT_METHOD_REQUIRED",
    );
  }

  let applicationFeeAmount: number | undefined;
  try {
    applicationFeeAmount = calculateApplicationFeeMinor({
      amountMinor: reservation.amountMinor,
      currencyExponent: reservation.currencyExponent,
      percent: reservation.applicationFeePercent,
      fixed: reservation.applicationFeeFixed,
    });
  } catch {
    await markCancellationCollectionFailure(reservation, {
      code: "APPLICATION_FEE_INVALID",
      message: "The workspace application fee configuration is invalid.",
    });
    return { chargeId, status: "FAILED", paymentIntentId: null };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: reservation.amountMinor,
        currency: reservation.currency.toLowerCase(),
        customer: reservation.stripeCustomerId,
        payment_method: paymentMethodId,
        payment_method_types: ["card"],
        confirm: true,
        off_session: true,
        metadata: paymentMetadata(reservation),
        transfer_data: { destination: reservation.providerAccountId },
        ...(applicationFeeAmount
          ? { application_fee_amount: applicationFeeAmount }
          : {}),
      },
      {
        idempotencyKey: `cancellation-charge:${chargeId}:attempt:${reservation.attempt}`,
      },
    );
    return recordCancellationPaymentIntent(reservation, paymentIntent);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeCardError) {
      const paymentIntent = error.payment_intent;
      await markCancellationCollectionFailure(
        reservation,
        {
          code: error.code ?? "STRIPE_CARD_DECLINED",
          message: "The saved payment method could not be charged.",
        },
        paymentIntent?.id ?? null,
      );
      return {
        chargeId,
        status: "REQUIRES_PAYMENT_METHOD",
        paymentIntentId: paymentIntent?.id ?? null,
      };
    }

    const permanentFailure = classifyPermanentCancellationStripeError(error);
    if (!permanentFailure) throw error;
    await markCancellationCollectionFailure(reservation, permanentFailure);
    return { chargeId, status: "FAILED", paymentIntentId: null };
  }
}

function isMissingStripeCustomer(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing" &&
    error.param === "customer"
  );
}

function paymentMetadata(
  details: Exclude<
    Awaited<ReturnType<typeof reserveCancellationCollection>>,
    { terminalStatus: string }
  >,
): Stripe.MetadataParam {
  return {
    commerceOperationId: details.operationId,
    cancellationChargeId: details.chargeId,
    organizationId: details.organizationId,
    locationId: details.locationId ?? "",
    clientId: details.clientId,
    studioBookingId: details.bookingId,
    stripeConnectionId: details.stripeConnectionId,
    collectionAttempt: String(details.attempt),
  };
}
