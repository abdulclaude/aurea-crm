import type { NextRequest, NextResponse } from "next/server";

import { handleStripeWebhookRequest } from "@/features/commerce/server/stripe/stripe-webhook-adapter";

export const runtime = "nodejs";

export function POST(request: NextRequest): Promise<NextResponse> {
  return handleStripeWebhookRequest(request, {
    source: "COMMERCE",
    secretEnvironmentVariables: [
      "STRIPE_COMMERCE_WEBHOOK_SECRET",
      "STRIPE_WEBHOOK_SECRET",
    ],
  });
}
