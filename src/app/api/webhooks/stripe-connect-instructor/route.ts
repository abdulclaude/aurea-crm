import type { NextRequest, NextResponse } from "next/server";

import { processStripeInstructorConnectEvent } from "@/features/commerce/server/stripe/stripe-connect-event-processor";
import { handleStripeWebhookRequest } from "@/features/commerce/server/stripe/stripe-webhook-adapter";

export const runtime = "nodejs";

export function POST(request: NextRequest): Promise<NextResponse> {
  return handleStripeWebhookRequest(request, {
    source: "STRIPE_CONNECT_INSTRUCTOR",
    secretEnvironmentVariables: ["STRIPE_CONNECT_WEBHOOK_SECRET"],
    processor: processStripeInstructorConnectEvent,
  });
}
