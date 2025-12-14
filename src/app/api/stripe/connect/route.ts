/**
 * Stripe Connect OAuth Initiation
 * Redirects user to Stripe to authorize account connection
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get active organization/subaccount from session
  const sessionRecord = await prisma.session.findUnique({
    where: { token: session.session.token },
    select: {
      activeOrganizationId: true,
      activeSubaccountId: true,
    },
  });

  const organizationId = sessionRecord?.activeOrganizationId;
  const subaccountId = sessionRecord?.activeSubaccountId;

  if (!organizationId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings/payments?stripe_error=${encodeURIComponent("Please select an organization or subaccount first")}`
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
      subaccountId,
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
