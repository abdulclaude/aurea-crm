/**
 * Stripe Connect OAuth Initiation
 * Redirects user to Stripe to authorize account connection
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { session as sessionTable } from "@/db/schema";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get active organization/location from session
  const sessionRecord = await db.query.session.findFirst({
    where: eq(sessionTable.token, session.session.token),
    columns: {
      activeOrganizationId: true,
      activeLocationId: true,
    },
  });

  const organizationId = sessionRecord?.activeOrganizationId;
  const locationId = sessionRecord?.activeLocationId;

  if (!organizationId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings/payments?stripe_error=${encodeURIComponent("Please select an organization or location first")}`
    );
  }

  const stripeClientId = process.env.STRIPE_CLIENT_ID;
  if (!stripeClientId) {
    return NextResponse.json(
      { error: "Stripe Connect not configured" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/stripe/callback`;

  // Build state parameter to include context
  const state = Buffer.from(
    JSON.stringify({
      locationId,
      organizationId,
      userId: session.user.id,
    })
  ).toString("base64");

  // Build Stripe OAuth URL
  const stripeOAuthUrl = new URL("https://connect.stripe.com/oauth/authorize");
  stripeOAuthUrl.searchParams.set("response_type", "code");
  stripeOAuthUrl.searchParams.set("client_id", stripeClientId);
  stripeOAuthUrl.searchParams.set("scope", "read_write");
  stripeOAuthUrl.searchParams.set("redirect_uri", redirectUri);
  stripeOAuthUrl.searchParams.set("state", state);

  // Redirect to Stripe
  return NextResponse.redirect(stripeOAuthUrl.toString());
}
