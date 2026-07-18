import type { NextRequest, NextResponse } from "next/server";

import { handleStripeWebhookRequest } from "@/features/commerce/server/stripe/stripe-webhook-adapter";

export const runtime = "nodejs";

export function POST(request: NextRequest): Promise<NextResponse> {
  return handleStripeWebhookRequest(request, {
    source: "INVOICES_COMPATIBILITY",
    secretEnvironmentVariables: [
      "STRIPE_INVOICE_WEBHOOK_SECRET",
      "STRIPE_COMMERCE_WEBHOOK_SECRET",
      "STRIPE_WEBHOOK_SECRET",
    ],
  });
}
