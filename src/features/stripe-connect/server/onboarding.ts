import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { stripeConnection } from "@/db/schema";
import { getStripePlatformClient } from "@/lib/stripe";
import type { StripeConnectContext } from "./authorization";
import { upsertStripeConnectAccount } from "./upsert-connection";

export class StripeConnectMigrationRequiredError extends Error {
  public constructor() {
    super(
      "This workspace has a legacy Stripe connection. Contact support to migrate it to Stripe Express before taking payments.",
    );
    this.name = "StripeConnectMigrationRequiredError";
  }
}

function connectionScopeWhere(context: StripeConnectContext) {
  return context.locationId
    ? and(
        eq(stripeConnection.organizationId, context.organizationId),
        eq(stripeConnection.locationId, context.locationId),
      )
    : and(
        eq(stripeConnection.organizationId, context.organizationId),
        isNull(stripeConnection.locationId),
      );
}

export async function createStripeConnectOnboardingLink(
  context: StripeConnectContext,
  appUrl: string,
): Promise<string> {
  const stripe = getStripePlatformClient();
  const [existingConnection] = await db
    .select({ stripeAccountId: stripeConnection.stripeAccountId })
    .from(stripeConnection)
    .where(connectionScopeWhere(context))
    .orderBy(desc(stripeConnection.isActive), desc(stripeConnection.updatedAt))
    .limit(1);

  const account = existingConnection
    ? await stripe.accounts.retrieve(existingConnection.stripeAccountId)
    : await stripe.accounts.create(
        {
          type: "express",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            organizationId: context.organizationId,
            locationId: context.locationId ?? "",
          },
        },
        {
          idempotencyKey: `stripe_connect_account_${context.organizationId}_${context.locationId ?? "organization"}`,
        },
      );

  if ("deleted" in account && account.deleted) {
    throw new Error("The connected Stripe account is no longer available");
  }

  if (account.type !== "express") {
    throw new StripeConnectMigrationRequiredError();
  }

  await upsertStripeConnectAccount(context, {
    stripeAccountId: account.id,
    accountType: account.type,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    email: account.email ?? null,
    businessName: account.business_profile?.name ?? null,
    country: account.country ?? null,
    currency: account.default_currency?.toUpperCase() ?? null,
  });

  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${appUrl}/settings/payments?stripe_onboarding=refresh`,
    return_url: `${appUrl}/settings/payments?stripe_onboarding=return`,
    type: "account_onboarding",
  });

  return link.url;
}
