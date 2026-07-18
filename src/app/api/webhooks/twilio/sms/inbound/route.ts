import { NextRequest, NextResponse } from "next/server";

import { verifyAndRecordTwilioWebhook } from "@/features/communications/server/twilio-webhook-receipts";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    return new NextResponse("Invalid signature", { status: 400 });
  }
  let body: string;
  try {
    body = await readBoundedRawBody(request);
  } catch (error) {
    if (error instanceof WebhookPayloadTooLargeError) {
      return new NextResponse("Payload too large", { status: 413 });
    }
    throw error;
  }
  const receipt = await verifyAndRecordTwilioWebhook({
    body,
    signature,
    pathname: "/api/webhooks/twilio/sms/inbound",
    eventType: "sms.inbound",
  });
  if (!receipt) return new NextResponse("Invalid signature", { status: 400 });
  return new NextResponse("<Response/>", {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
