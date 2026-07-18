import { NextRequest, NextResponse } from "next/server";

import { buildInboundVoiceResponse } from "@/features/communications/server/voice-inbound-response";
import {
  twilioInboundVoiceSchema,
  verifyAndRecordTwilioWebhook,
} from "@/features/communications/server/twilio-webhook-receipts";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return new NextResponse("Invalid signature", { status: 400 });
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
    pathname: "/api/webhooks/twilio/voice/inbound",
    eventType: "voice.inbound",
  });
  if (!receipt) return new NextResponse("Invalid signature", { status: 400 });
  const event = twilioInboundVoiceSchema.safeParse(receipt.values);
  if (!event.success)
    return new NextResponse("Invalid payload", { status: 400 });
  const twiml = await buildInboundVoiceResponse({
    organizationId: receipt.organizationId,
    providerAccountId: receipt.providerAccountId,
    callSid: event.data.CallSid,
    to: event.data.To,
    from: event.data.From,
    fromCountry: event.data.FromCountry,
  });
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
