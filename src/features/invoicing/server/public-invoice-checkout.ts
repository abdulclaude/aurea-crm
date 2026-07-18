import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db";
import { stripeConnection } from "@/db/schema";
import {
  currencyExponent,
  decimalToMinorUnits,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import {
  attachStripeCheckoutToOperation,
  createOrReuseCheckoutOperation,
} from "@/features/commerce/server/operations";
import { calculateInvoiceApplicationFeeMinor } from "@/features/invoicing/lib/invoice-application-fee";
import { buildInvoiceCheckoutIdempotencyKey } from "@/features/invoicing/lib/public-invoice-access";
import {
  buildDestinationChargePaymentData,
  assertExpressDestinationAccount,
} from "@/features/stripe-connect/lib/destination-charge";
import { getStripePlatformClient } from "@/lib/stripe";

import { buildPublicInvoiceUrl } from "./invoice-access-tokens";
import { resolvePublicInvoiceContext } from "./public-invoice-access";

export type PublicInvoicePaymentErrorCode =
  | "INVOICE_NOT_PAYABLE"
  | "PAYMENT_METHOD_UNAVAILABLE"
  | "STRIPE_ACCOUNT_NOT_READY"
  | "CHECKOUT_UNAVAILABLE";

export class PublicInvoicePaymentError extends Error {
  readonly code: PublicInvoicePaymentErrorCode;
  readonly originalCause: unknown;

  constructor(
    code: PublicInvoicePaymentErrorCode,
    message: string,
    originalCause?: unknown,
  ) {
    super(message);
    this.name = "PublicInvoicePaymentError";
    this.code = code;
    this.originalCause = originalCause;
  }
}

export async function createPublicInvoiceCheckout(input: {
  token: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const context = await resolvePublicInvoiceContext({
    token: input.token,
    purpose: "PAY",
  });

  if (
    context.invoice.status === "DRAFT" ||
    context.invoice.status === "CANCELLED" ||
    context.invoice.status === "PAID"
  ) {
    throw new PublicInvoicePaymentError(
      "INVOICE_NOT_PAYABLE",
      "This invoice is not available for card payment",
    );
  }
  if (!context.invoice.paymentOptions.stripe) {
    throw new PublicInvoicePaymentError(
      "PAYMENT_METHOD_UNAVAILABLE",
      "Card payment is not enabled for this invoice",
    );
  }

  const currency = normalizeCurrency(context.invoice.currency);
  const exponent = currencyExponent(currency);
  const amountMinor = decimalToMinorUnits(context.invoice.amountDue, exponent);
  if (amountMinor <= 0) {
    throw new PublicInvoicePaymentError(
      "INVOICE_NOT_PAYABLE",
      "This invoice has no outstanding balance",
    );
  }

  const scopeCondition = context.privateInvoice.locationId
    ? eq(stripeConnection.locationId, context.privateInvoice.locationId)
    : isNull(stripeConnection.locationId);
  const [connection] = await db
    .select({
      id: stripeConnection.id,
      stripeAccountId: stripeConnection.stripeAccountId,
      accountType: stripeConnection.accountType,
      applicationFeePercent: stripeConnection.applicationFeePercent,
      applicationFeeFixed: stripeConnection.applicationFeeFixed,
    })
    .from(stripeConnection)
    .where(
      and(
        eq(
          stripeConnection.organizationId,
          context.privateInvoice.organizationId,
        ),
        scopeCondition,
        eq(stripeConnection.isActive, true),
      ),
    )
    .limit(1);

  if (!connection) {
    throw new PublicInvoicePaymentError(
      "PAYMENT_METHOD_UNAVAILABLE",
      "Card payment is not configured for this invoice",
    );
  }
  try {
    assertExpressDestinationAccount(connection.accountType.toLowerCase());
  } catch (error) {
    throw new PublicInvoicePaymentError(
      "STRIPE_ACCOUNT_NOT_READY",
      "The payment account must be migrated before accepting payments",
      error,
    );
  }

  const stripe = getStripePlatformClient();
  try {
    const account = await stripe.accounts.retrieve(connection.stripeAccountId);
    assertExpressDestinationAccount(account.type.toLowerCase());
    if (!account.charges_enabled || !account.payouts_enabled) {
      throw new PublicInvoicePaymentError(
        "STRIPE_ACCOUNT_NOT_READY",
        "The payment account is not ready to accept this payment",
      );
    }
  } catch (error) {
    if (error instanceof PublicInvoicePaymentError) {
      throw error;
    }
    throw new PublicInvoicePaymentError(
      "CHECKOUT_UNAVAILABLE",
      "The payment account could not be verified",
      error,
    );
  }

  const applicationFeeAmount = calculateInvoiceApplicationFeeMinor({
    amountMinor,
    currencyExponent: exponent,
    percent: connection.applicationFeePercent,
    fixed: connection.applicationFeeFixed,
  });
  const operation = await createOrReuseCheckoutOperation({
    organizationId: context.privateInvoice.organizationId,
    locationId: context.privateInvoice.locationId,
    clientId: context.privateInvoice.clientId,
    stripeConnectionId: connection.id,
    providerAccountId: connection.stripeAccountId,
    idempotencyKey: buildInvoiceCheckoutIdempotencyKey({
      grantId: context.grant.id,
      invoiceId: context.privateInvoice.id,
      providerAccountId: connection.stripeAccountId,
      amountMinor,
      currency,
    }),
    amountMinor,
    currency,
    currencyExponent: exponent,
    invoiceId: context.privateInvoice.id,
    expiresAt: context.grant.expiresAt,
    metadata: {
      checkoutKind: "INVOICE",
      source: "public_invoice_payment",
      invoiceAccessGrantId: context.grant.id,
    },
  });

  if (operation.providerCheckoutSessionId) {
    return retrieveReusableCheckout(
      stripe,
      operation.providerCheckoutSessionId,
    );
  }

  const hostedInvoiceUrl = buildPublicInvoiceUrl({
    baseUrl:
      process.env.APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
    token: input.token,
    purpose: "PAY",
  });
  const metadata: Stripe.MetadataParam = {
    commerceOperationId: operation.id,
    stripeConnectionId: connection.id,
    checkoutKind: "INVOICE",
    invoiceId: context.privateInvoice.id,
    organizationId: context.privateInvoice.organizationId,
    invoiceAccessGrantId: context.grant.id,
    ...(context.privateInvoice.clientId
      ? { clientId: context.privateInvoice.clientId }
      : {}),
    ...(context.privateInvoice.locationId
      ? { locationId: context.privateInvoice.locationId }
      : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `Invoice ${context.invoice.invoiceNumber}`,
              },
              unit_amount: amountMinor,
            },
            quantity: 1,
          },
        ],
        success_url: `${hostedInvoiceUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${hostedInvoiceUrl}?canceled=true`,
        client_reference_id: operation.id,
        ...(context.privateInvoice.clientEmail
          ? { customer_email: context.privateInvoice.clientEmail }
          : {}),
        metadata,
        payment_intent_data: buildDestinationChargePaymentData({
          destinationAccountId: connection.stripeAccountId,
          applicationFeeAmount,
          metadata,
        }),
      },
      { idempotencyKey: operation.id },
    );

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL");
    }

    await attachStripeCheckoutToOperation({
      operationId: operation.id,
      checkoutSessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  } catch (error) {
    if (error instanceof PublicInvoicePaymentError) {
      throw error;
    }
    throw new PublicInvoicePaymentError(
      "CHECKOUT_UNAVAILABLE",
      "The secure checkout could not be started",
      error,
    );
  }
}

async function retrieveReusableCheckout(
  stripe: Stripe,
  sessionId: string,
): Promise<{ checkoutUrl: string; sessionId: string }> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session.url || session.status !== "open") {
      throw new PublicInvoicePaymentError(
        "CHECKOUT_UNAVAILABLE",
        "This checkout is no longer available; request a fresh invoice link",
      );
    }
    return { checkoutUrl: session.url, sessionId: session.id };
  } catch (error) {
    if (error instanceof PublicInvoicePaymentError) {
      throw error;
    }
    throw new PublicInvoicePaymentError(
      "CHECKOUT_UNAVAILABLE",
      "The secure checkout could not be resumed",
      error,
    );
  }
}
