import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

import { resendWebhookEventSchema } from "@/features/delivery/server/resend-events";
import {
  recordManagedResendWebhook,
  requestManagedResendReceiptProcessing,
} from "@/features/communications/server/resend-webhook-receipts";
import { getPlatformResendCredentials } from "@/features/communications/server/platform-credentials";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";

function verifies(body: string, headers: Record<string, string>): boolean {
  const credentials = getPlatformResendCredentials();
  return [credentials.webhookSecret, credentials.previousWebhookSecret]
    .filter((secret): secret is string => Boolean(secret))
    .some((secret) => {
      try {
        new Webhook(secret).verify(body, headers);
        return true;
      } catch {
        return false;
      }
    });
}

export async function POST(request: NextRequest) {
  const providerEventId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!providerEventId || !timestamp || !signature) {
    return NextResponse.json(
      { error: "Missing webhook signature headers" },
      { status: 400 },
    );
  }
  let body: string;
  try {
    body = await readBoundedRawBody(request);
  } catch (error) {
    if (error instanceof WebhookPayloadTooLargeError) {
      return NextResponse.json(
        { error: "Webhook payload is too large" },
        { status: 413 },
      );
    }
    throw error;
  }
  if (
    !verifies(body, {
      "svix-id": providerEventId,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    })
  ) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(body) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const event = resendWebhookEventSchema.safeParse(raw);
  if (!event.success) {
    return NextResponse.json(
      { error: "Unsupported webhook payload" },
      { status: 400 },
    );
  }
  try {
    const receipt = await recordManagedResendWebhook({
      providerEventId,
      payloadHash: createHash("sha256").update(body).digest("hex"),
      rawBody: body,
      eventType: event.data.type,
      providerResourceId: event.data.data.email_id,
      occurredAt: event.data.created_at,
    });
    await requestManagedResendReceiptProcessing(receipt.receiptId);
    return NextResponse.json({ received: true, ...receipt });
  } catch (error) {
    console.error("Failed to persist managed Resend webhook", {
      providerEventId,
      error: error instanceof Error ? error.message : "Unknown webhook error",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
