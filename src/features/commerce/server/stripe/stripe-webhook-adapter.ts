import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";
import { getStripePlatformClient } from "@/lib/stripe";
import { triggerPricingOptionPurchasedWorkflowsForReceipt } from "@/features/workflows/server/pricing-option-purchased-trigger-service";

import {
  assertStripeBodySize,
  MAX_STRIPE_WEBHOOK_BYTES,
  PermanentStripeEventError,
  toStripeEventEnvelope,
} from "./stripe-event-contract";
import { processStripePlatformEvent } from "./stripe-event-processor";
import { expectedStripeEventLivemode } from "./stripe-event-mode";
import {
  persistStripeEventReceipt,
  processStripeEventReceipt,
  type StripeEventProcessor,
} from "./stripe-event-receipt";

type StripeWebhookAdapterOptions = {
  source: string;
  secretEnvironmentVariables: readonly string[];
  processor?: StripeEventProcessor;
};

export async function handleStripeWebhookRequest(
  request: NextRequest,
  options: StripeWebhookAdapterOptions,
): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return response({ error: "Missing stripe-signature header" }, 400);
  }

  const secret = firstConfiguredSecret(options.secretEnvironmentVariables);
  if (!secret) {
    console.error("[stripe-webhook] endpoint secret is not configured", {
      source: options.source,
      expectedVariables: options.secretEnvironmentVariables,
    });
    return response({ error: "Webhook endpoint is not configured" }, 503);
  }

  const expectedLivemode = expectedStripeEventLivemode(
    process.env.STRIPE_SECRET_KEY,
  );
  if (expectedLivemode === null) {
    console.error("[stripe-webhook] Stripe API key mode is not configured", {
      source: options.source,
    });
    return response({ error: "Webhook endpoint is not configured" }, 503);
  }

  let rawBody: string;
  try {
    rawBody = await readBoundedRawBody(request, MAX_STRIPE_WEBHOOK_BYTES);
    assertStripeBodySize(rawBody);
  } catch (error) {
    if (
      error instanceof WebhookPayloadTooLargeError ||
      error instanceof PermanentStripeEventError
    ) {
      return response({ error: "Webhook payload is too large" }, 413);
    }
    throw error;
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = getStripePlatformClient().webhooks.constructEvent(
      rawBody,
      signature,
      secret,
    );
  } catch {
    return response({ error: "Invalid Stripe signature" }, 400);
  }

  if (stripeEvent.livemode !== expectedLivemode) {
    console.error("[stripe-webhook] rejected event from an unexpected mode", {
      eventId: stripeEvent.id,
      eventLivemode: stripeEvent.livemode,
      expectedLivemode,
      source: options.source,
    });
    return response(
      { error: "Stripe event mode does not match this environment" },
      400,
    );
  }

  const event = toStripeEventEnvelope(stripeEvent);
  try {
    const receipt = await persistStripeEventReceipt({
      event,
      rawBody,
      source: options.source,
    });
    const processed = await processStripeEventReceipt({
      receiptId: receipt.receiptId,
      event,
      processor: options.processor ?? processStripePlatformEvent,
    });
    if (processed.status === "PROCESSED") {
      await triggerPricingOptionPurchasedWorkflowsForReceipt(receipt.receiptId);
    }

    if (processed.status === "FAILED" && processed.retryable) {
      console.error("[stripe-webhook] event processing will be retried", {
        eventId: event.id,
        eventType: event.type,
        receiptId: receipt.receiptId,
        source: options.source,
      });
      return response({ received: true, retryScheduled: true }, 500);
    }

    if (processed.status === "DEAD_LETTER") {
      console.error("[stripe-webhook] event moved to dead letter", {
        eventId: event.id,
        eventType: event.type,
        receiptId: receipt.receiptId,
        source: options.source,
      });
    }

    return response({ received: true }, 200);
  } catch (error) {
    console.error("[stripe-webhook] receipt persistence failed", {
      eventId: event.id,
      eventType: event.type,
      source: options.source,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return response({ error: "Webhook receipt could not be persisted" }, 500);
  }
}

function firstConfiguredSecret(names: readonly string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

function response(
  body: Record<string, boolean | string>,
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
