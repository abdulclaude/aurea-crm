/**
 * Stripe Connect OAuth Callback
 * Handles the OAuth callback from Stripe after account connection
 */

import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import Stripe from "stripe";
import { db } from "@/db";
import { stripeConnection } from "@/db/schema";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    })
  : null;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Handle authorization error
  if (error) {
    console.error("Stripe Connect authorization error:", error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/settings?stripe_error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      `${baseUrl}/settings?stripe_error=Missing authorization code`
    );
  }

  if (!stripe) {
    return NextResponse.redirect(
      `${baseUrl}/settings?stripe_error=Stripe not configured`
    );
  }

  try {
    // Decode state parameter
    const state = JSON.parse(Buffer.from(stateParam, "base64").toString());
    const { locationId, organizationId, userId } = state;

    if (!organizationId) {
      throw new Error("Invalid state parameter - missing organizationId");
    }

    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      stripe_user_id: stripeAccountId,
    } = response;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "Missing stripe_user_id in response" },
        { status: 400 }
      );
    }

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId);

    if ("deleted" in account && account.deleted) {
      return NextResponse.json(
        { error: "Connected Stripe account is deleted" },
        { status: 400 }
      );
    }

    // Save connection to database
    await db
      .insert(stripeConnection)
      .values({
        id: createId(),
        organizationId,
        locationId: locationId || null,
        stripeAccountId,
        accountType: account.type || "standard",
        accessToken,
        refreshToken: refreshToken || null,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        email: account.email || null,
        businessName: account.business_profile?.name || null,
        country: account.country || null,
        currency: account.default_currency?.toUpperCase() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: stripeConnection.stripeAccountId,
        set: {
        accountType: account.type || "standard",
        accessToken,
        refreshToken: refreshToken || null,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        email: account.email || null,
        businessName: account.business_profile?.name || null,
        country: account.country || null,
        currency: account.default_currency?.toUpperCase() || null,
        isActive: true,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
        },
      });

    // Redirect back to settings with success
    const redirectPath = locationId
      ? `/settings/payments?stripe_success=true`
      : `/settings/payments?stripe_success=true`;

    return NextResponse.redirect(`${baseUrl}${redirectPath}`);
  } catch (error) {
    console.error("Stripe Connect callback error:", error);
    return NextResponse.redirect(
      `${baseUrl}/settings?stripe_error=${encodeURIComponent(
        error instanceof Error ? error.message : "Failed to connect Stripe account"
      )}`
    );
  }
}
