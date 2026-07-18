import "server-only";

import Stripe from "stripe";

let stripePlatformClient: Stripe | null | undefined;

/**
 * Deployment infrastructure client. Callers must resolve and authorize an
 * organization/location-owned Stripe account before performing tenant work.
 */
export function getStripePlatformClient(): Stripe {
  if (stripePlatformClient === undefined) {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    stripePlatformClient = secretKey
      ? new Stripe(secretKey, { apiVersion: "2025-11-17.clover" })
      : null;
  }

  if (!stripePlatformClient) {
    throw new Error("Stripe Connect platform infrastructure is not configured");
  }
  return stripePlatformClient;
}

export async function syncStripeConnectAccount(stripeAccountId: string) {
  const stripe = getStripePlatformClient();

  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    if ("deleted" in account && account.deleted) {
      return { success: false, error: "The Stripe account is no longer available" };
    }

    return {
      success: true,
      account: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        email: account.email ?? null,
        businessName: account.business_profile?.name ?? null,
        country: account.country ?? null,
        currency: account.default_currency?.toUpperCase() ?? null,
      },
    };
  } catch (error: unknown) {
    console.error("[stripe-connect.sync] Stripe account sync failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, error: "Failed to sync Stripe account" };
  }
}
