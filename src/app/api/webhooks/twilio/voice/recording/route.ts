import { NextRequest, NextResponse } from "next/server";

import { verifyAndRecordTwilioWebhook } from "@/features/communications/server/twilio-webhook-receipts";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let body: string;
  try {
    body = await readBoundedRawBody(request);
  } catch (error) {
    if (error instanceof WebhookPayloadTooLargeError) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    throw error;
  }
  const receipt = await verifyAndRecordTwilioWebhook({
    body,
    signature,
    pathname: "/api/webhooks/twilio/voice/recording",
    eventType: "voice.recording",
  });
  return receipt
    ? NextResponse.json({ received: true })
    : NextResponse.json({ error: "Invalid signature" }, { status: 400 });
}
