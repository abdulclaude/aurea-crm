import "server-only";

import { normalizeCurrency } from "@/features/commerce/lib/money";

import { writeCommerceLedgerEntry } from "../ledger-writer";
import {
  completeCommerceOperation,
  resolveOperationForStripeEvent,
} from "../operations";
import {
  applyInvoiceCheckout,
  applyBookingCheckout,
} from "./apply-invoice-booking-checkout";
import { applyStripeDispute, applyStripeRefund } from "./apply-refund-dispute";
import {
  applyDirectPaymentIntentFailure,
  applyDirectPaymentIntentSuccess,
} from "./apply-direct-payment-intent";
import { applyStudioCheckout } from "./apply-studio-checkout";
import {
  applyFailedMembershipInvoice,
  applyPaidMembershipInvoice,
} from "./apply-studio-subscription-event";
import { applySubscriptionState } from "./apply-subscription-state";
import { applyCheckoutFailure } from "./apply-checkout-failure";
import { resolveCheckoutScope } from "./resolve-checkout-scope";
import { requireHistoricalStripeConnection } from "./stripe-connection-binding";
import {
  PermanentStripeEventError,
  type StripeEventEnvelope,
} from "./stripe-event-contract";
import { assertPaymentIntentDestination } from "./payment-intent-account-binding";
import type {
  StripeEventHandlerResult,
  StripeEventProcessor,
} from "./stripe-event-receipt";
import {
  checkoutSessionSchema,
  disputeSchema,
  metadataValue,
  paymentIntentSchema,
  refundSchema,
  stripeInvoiceSchema,
  subscriptionSchema,
} from "./stripe-object-contracts";

export const processStripePlatformEvent: StripeEventProcessor = async ({
  tx,
  event,
  receiptId,
}) => {
  const occurredAt = new Date(event.created * 1_000);

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = parseStripeObject(checkoutSessionSchema, event);
      if (
        event.type === "checkout.session.completed" &&
        session.payment_status &&
        !["paid", "no_payment_required"].includes(session.payment_status)
      ) {
        return { outcome: "IGNORED" };
      }

      const checkout = await resolveCheckoutScope({
        tx,
        session,
        eventAccountId: event.accountId,
      });
      if (checkout.kind === "INVOICE") {
        await applyInvoiceCheckout({ tx, checkout, receiptId, occurredAt });
      } else if (checkout.kind === "BOOKING") {
        await applyBookingCheckout({ tx, checkout, receiptId, occurredAt });
      } else {
        await applyStudioCheckout({ tx, checkout, receiptId, occurredAt });
      }
      return processedScope(checkout);
    }

    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = parseStripeObject(checkoutSessionSchema, event);
      const checkout = await resolveCheckoutScope({
        tx,
        session,
        eventAccountId: event.accountId,
      });
      const waitlistOffer = await applyCheckoutFailure({
        tx,
        checkout,
        receiptId,
        occurredAt,
        kind:
          event.type === "checkout.session.expired"
            ? "EXPIRED"
            : "ASYNC_FAILED",
      });
      return { ...processedScope(checkout), waitlistOffer };
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const invoice = parseStripeObject(stripeInvoiceSchema, event);
      const scope = await applyPaidMembershipInvoice({
        tx,
        invoice,
        receiptId,
        eventAccountId: event.accountId,
        occurredAt,
      });
      return scope
        ? { outcome: "PROCESSED", ...scope }
        : { outcome: "IGNORED" };
    }

    case "invoice.payment_failed": {
      const invoice = parseStripeObject(stripeInvoiceSchema, event);
      const scope = await applyFailedMembershipInvoice({
        tx,
        invoice,
        receiptId,
        eventAccountId: event.accountId,
        occurredAt,
      });
      return scope
        ? { outcome: "PROCESSED", ...scope }
        : { outcome: "IGNORED" };
    }

    case "refund.created":
    case "refund.updated":
    case "refund.failed": {
      const refund = parseStripeObject(refundSchema, event);
      const scope = await applyStripeRefund({
        tx,
        refund,
        receiptId,
        providerAccountId: event.accountId,
        occurredAt,
      });
      return scope
        ? { outcome: "PROCESSED", ...scope }
        : { outcome: "IGNORED" };
    }

    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed": {
      const dispute = parseStripeObject(disputeSchema, event);
      const scope = await applyStripeDispute({
        tx,
        dispute,
        receiptId,
        providerAccountId: event.accountId,
        occurredAt,
      });
      return scope
        ? { outcome: "PROCESSED", ...scope }
        : { outcome: "IGNORED" };
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = parseStripeObject(subscriptionSchema, event);
      const scope = await applySubscriptionState({
        tx,
        subscription,
        eventType: event.type,
        eventAccountId: event.accountId,
        occurredAt,
      });
      return scope
        ? { outcome: "PROCESSED", ...scope }
        : { outcome: "IGNORED" };
    }

    case "payment_intent.succeeded": {
      const paymentIntent = parseStripeObject(paymentIntentSchema, event);
      const scope = await applyDirectPaymentIntentSuccess({
        tx,
        paymentIntent,
        receiptId,
        eventAccountId: event.accountId,
        occurredAt,
      });
      return scope
        ? { outcome: "PROCESSED", ...scope }
        : { outcome: "IGNORED" };
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = parseStripeObject(paymentIntentSchema, event);
      const operation = await resolveOperationForStripeEvent({
        tx,
        operationId: metadataValue(
          paymentIntent.metadata,
          "commerceOperationId",
        ),
        paymentIntentId: paymentIntent.id,
      });
      if (!operation) return { outcome: "IGNORED" };
      if (
        operation.amountMinor !== paymentIntent.amount ||
        operation.currency !== normalizeCurrency(paymentIntent.currency)
      ) {
        throw new PermanentStripeEventError(
          "FAILED_PAYMENT_OPERATION_MISMATCH",
          "Failed Stripe payment does not match its commerce operation",
        );
      }
      if (operation.type === "PAYMENT") {
        assertPaymentIntentDestination({
          paymentIntent,
          providerAccountId: operation.providerAccountId,
        });
      }
      const connection = await requireHistoricalStripeConnection({
        tx,
        stripeConnectionId: operation.stripeConnectionId,
        organizationId: operation.organizationId,
        locationId: operation.locationId,
        providerAccountId: operation.providerAccountId,
        eventAccountId: event.accountId,
        requireExternalSnapshot: true,
      });

      await writeCommerceLedgerEntry(tx, {
        organizationId: operation.organizationId,
        locationId: operation.locationId,
        operationId: operation.id,
        provider: "STRIPE",
        stripeConnectionId: connection.id,
        providerAccountId: connection.stripeAccountId,
        providerObjectId: `${paymentIntent.id}:failure`,
        providerObjectType: "payment_intent",
        kind: "PAYMENT",
        status: "FAILED",
        paymentIntentId: paymentIntent.id,
        chargeId:
          typeof paymentIntent.latest_charge === "string"
            ? paymentIntent.latest_charge
            : (paymentIntent.latest_charge?.id ?? null),
        amountMinor: paymentIntent.amount,
        currency: paymentIntent.currency,
        currencyExponent: operation.currencyExponent,
        clientId: operation.clientId,
        membershipId: operation.membershipId,
        bookingId: operation.bookingId,
        studioBookingId: operation.studioBookingId,
        invoiceId: operation.invoiceId,
        stripeEventId: receiptId,
        occurredAt,
        metadata: {
          failureCode: paymentIntent.last_payment_error?.code ?? null,
          failureType: paymentIntent.last_payment_error?.type ?? null,
        },
      });
      await completeCommerceOperation(tx, operation.id, "FAILED", {
        code: paymentIntent.last_payment_error?.code ?? "STRIPE_PAYMENT_FAILED",
        message: "Stripe reported that the payment failed",
      });
      if (operation.type === "PAYMENT") {
        await applyDirectPaymentIntentFailure({
          tx,
          operationId: operation.id,
          paymentIntent,
          occurredAt,
        });
      }
      return {
        outcome: "PROCESSED",
        organizationId: operation.organizationId,
        locationId: operation.locationId,
        stripeConnectionId: connection.id,
      };
    }

    default:
      return { outcome: "IGNORED" };
  }
};

function parseStripeObject<T>(
  schema: {
    safeParse(value: unknown): { success: true; data: T } | { success: false };
  },
  event: StripeEventEnvelope,
): T {
  const parsed = schema.safeParse(event.dataObject);
  if (!parsed.success) {
    throw new PermanentStripeEventError(
      "STRIPE_OBJECT_INVALID",
      `Stripe event ${event.type} has an invalid object contract`,
    );
  }
  return parsed.data;
}

function processedScope(input: {
  organizationId: string;
  locationId: string | null;
  stripeConnectionId: string;
}): StripeEventHandlerResult {
  return {
    outcome: "PROCESSED",
    organizationId: input.organizationId,
    locationId: input.locationId,
    stripeConnectionId: input.stripeConnectionId,
  };
}
