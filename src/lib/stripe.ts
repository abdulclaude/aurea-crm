/**
 * Stripe Payment Service
 * Handles payment processing via Stripe with per-subaccount credentials
 */

import Stripe from "stripe";

// Global Stripe instance (fallback)
const globalStripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    })
  : null;

/**
 * Get Stripe instance for a specific subaccount or use global instance
 */
export function getStripeInstance(stripeSecretKey?: string): Stripe {
  if (!stripeSecretKey && !globalStripe) {
    throw new Error("Stripe not configured - no API key provided");
  }

  if (stripeSecretKey) {
    return new Stripe(stripeSecretKey, {
      apiVersion: "2025-11-17.clover",
    });
  }

  return globalStripe!;
}

export interface CreatePaymentLinkParams {
  invoiceId: string;
  invoiceNumber: string;
  amount: number; // in cents
  currency: string;
  contactEmail: string;
  contactName: string;
  lineItems: Array<{
    name: string;
    quantity: number;
    amount: number; // in cents
  }>;
  successUrl: string;
  cancelUrl: string;
  stripeSecretKey?: string; // Optional per-subaccount Stripe key
}

/**
 * Create a Stripe Checkout Session for invoice payment
 */
export async function createStripeCheckoutSession(params: CreatePaymentLinkParams) {
  const { stripeSecretKey, ...sessionParams } = params;
  const stripe = getStripeInstance(stripeSecretKey);

  const {
    invoiceId,
    invoiceNumber,
    amount,
    currency,
    contactEmail,
    contactName,
    lineItems,
    successUrl,
    cancelUrl,
  } = sessionParams;

  try {
    // Create line items for Stripe
    const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lineItems.map(
      (item) => ({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: item.name,
            description: `Invoice ${invoiceNumber}`,
          },
          unit_amount: item.amount,
        },
        quantity: item.quantity,
      })
    );

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: stripeLineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: contactEmail,
      client_reference_id: invoiceId,
      metadata: {
        invoiceId,
        invoiceNumber,
        contactName,
      },
      payment_intent_data: {
        metadata: {
          invoiceId,
          invoiceNumber,
        },
      },
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error("Failed to create Stripe checkout session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create payment session",
    };
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string,
  stripeSecretKey?: string
) {
  const stripe = getStripeInstance(stripeSecretKey);

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return { success: true, event };
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid signature",
    };
  }
}

/**
 * Handle Stripe checkout completed event
 */
export interface StripeCheckoutCompletedData {
  invoiceId: string;
  amountPaid: number;
  paymentIntentId: string;
  customerEmail: string;
}

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<StripeCheckoutCompletedData | null> {
  const invoiceId = session.metadata?.invoiceId || session.client_reference_id;

  if (!invoiceId) {
    console.error("No invoice ID in checkout session");
    return null;
  }

  return {
    invoiceId,
    amountPaid: session.amount_total || 0,
    paymentIntentId: session.payment_intent as string,
    customerEmail: session.customer_email || session.customer_details?.email || "",
  };
}

/**
 * Get Stripe checkout session
 */
export async function getCheckoutSession(sessionId: string, stripeSecretKey?: string) {
  const stripe = getStripeInstance(stripeSecretKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return { success: true, session };
  } catch (error) {
    console.error("Failed to retrieve checkout session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to retrieve session",
    };
  }
}

/**
 * Stripe Connect Functions
 */

export interface CreateConnectCheckoutParams {
  invoiceId: string;
  invoiceNumber: string;
  amount: number; // in cents
  currency: string;
  contactEmail: string;
  contactName: string;
  lineItems: Array<{
    name: string;
    quantity: number;
    amount: number; // in cents
  }>;
  successUrl: string;
  cancelUrl: string;
  stripeAccountId: string; // Connected Stripe account ID
  applicationFeeAmount?: number; // Platform fee in cents
}

/**
 * Create a Stripe Checkout Session using Stripe Connect
 * Payment goes directly to the connected account, with optional platform fee
 */
export async function createStripeCheckoutSessionForConnect(
  params: CreateConnectCheckoutParams
) {
  // Use platform Stripe instance
  const stripe = getStripeInstance();

  const {
    invoiceId,
    invoiceNumber,
    amount,
    currency,
    contactEmail,
    contactName,
    lineItems,
    successUrl,
    cancelUrl,
    stripeAccountId,
    applicationFeeAmount,
  } = params;

  try {
    // Create line items for Stripe
    const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      lineItems.map((item) => ({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: item.name,
            description: `Invoice ${invoiceNumber}`,
          },
          unit_amount: item.amount,
        },
        quantity: item.quantity,
      }));

    // Create checkout session with connected account
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: stripeLineItems,
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: contactEmail,
        client_reference_id: invoiceId,
        metadata: {
          invoiceId,
          invoiceNumber,
          contactName,
        },
        payment_intent_data: {
          metadata: {
            invoiceId,
            invoiceNumber,
          },
          ...(applicationFeeAmount && {
            application_fee_amount: applicationFeeAmount,
          }),
        },
      },
      {
        stripeAccount: stripeAccountId, // This makes the payment go to the connected account
      }
    );

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error("Failed to create Stripe Connect checkout session:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create payment session",
    };
  }
}

/**
 * Sync account information from Stripe
 */
export async function syncStripeConnectAccount(stripeAccountId: string) {
  const stripe = getStripeInstance();

  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);

    return {
      success: true,
      account: {
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        email: account.email || null,
        businessName: account.business_profile?.name || null,
        country: account.country || null,
        currency: account.default_currency?.toUpperCase() || null,
      },
    };
  } catch (error) {
    console.error("Failed to sync Stripe Connect account:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to sync account",
    };
  }
}

/**
 * Disconnect a Stripe Connect account
 */
export async function disconnectStripeConnectAccount(stripeAccountId: string) {
  const stripe = getStripeInstance();

  try {
    await stripe.oauth.deauthorize({
      stripe_user_id: stripeAccountId,
    } as any);

    return { success: true };
  } catch (error) {
    console.error("Failed to disconnect Stripe Connect account:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to disconnect account",
    };
  }
}
