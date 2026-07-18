import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

import {
  recordResendProviderEvent,
  resendWebhookEventSchema,
} from "@/features/delivery/server/resend-events";
import {
  recordResendInboundReceipt,
  requestInboundReceiptProcessing,
} from "@/features/inbox/server/inbound-receipts";
import {
  resolveProviderAccountForWebhook,
  type ResolvedProviderAccount,
} from "@/features/provider-accounts/server/resolver";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";

type RouteContext = {
  params: Promise<{ providerAccountId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { providerAccountId } = await context.params;
  let account: ResolvedProviderAccount;
  try {
    account = await resolveProviderAccountForWebhook({
      providerAccountId,
      provider: "RESEND",
    });
  } catch {
    return NextResponse.json(
      { error: "Webhook account not found" },
      { status: 404 },
    );
  }
  if (account.ownershipMode === "PLATFORM_MANAGED") {
    return NextResponse.json(
      { error: "Managed Resend events use the shared webhook endpoint" },
      { status: 410 },
    );
  }
  if (!account.webhookSecret) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 503 },
    );
  }

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
  try {
    new Webhook(account.webhookSecret).verify(body, {
      "svix-id": providerEventId,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(body) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }
  const parsedPayload = resendWebhookEventSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "Unsupported webhook payload" },
      { status: 400 },
    );
  }

  try {
    const payloadHash = createHash("sha256").update(body).digest("hex");
    if (parsedPayload.data.type === "email.received") {
      const receipt = await recordResendInboundReceipt({
        providerAccountId: account.id,
        organizationId: account.organizationId,
        locationId: account.locationId,
        providerEventId,
        payloadHash,
        event: parsedPayload.data,
      });
      await requestInboundReceiptProcessing(receipt.receiptId);
      return NextResponse.json({ received: true, ...receipt });
    }
    const result = await recordResendProviderEvent({
      providerAccountId: account.id,
      organizationId: account.organizationId,
      locationId: account.locationId,
      providerEventId,
      payloadHash,
      event: parsedPayload.data,
    });
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("Failed to persist verified Resend event", {
      providerAccountId: account.id,
      providerEventId,
      error: error instanceof Error ? error.message : "Unknown event error",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
