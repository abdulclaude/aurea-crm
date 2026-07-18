import { and, eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { calComCredential } from "@/db/schema";
import {
  calComWebhookEventKey,
  calComWebhookEventSchema,
  verifyCalComWebhookSignature,
} from "@/features/bookings/server/calcom-webhook-contract";
import { applyCalComWebhook } from "@/features/bookings/server/calcom-webhook-service";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";
import { decrypt } from "@/lib/encryption";

const envelopeSchema = z.object({ triggerEvent: z.string().min(1) }).passthrough();
const supportedEvents = new Set([
  "BOOKING_CREATED",
  "BOOKING_RESCHEDULED",
  "BOOKING_CANCELLED",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ credentialId: string }> },
): Promise<NextResponse> {
  const { credentialId } = await context.params;
  try {
    const credential = await db.query.calComCredential.findFirst({
      where: and(
        eq(calComCredential.id, credentialId),
        eq(calComCredential.isActive, true),
        isNotNull(calComCredential.locationId),
        isNotNull(calComCredential.webhookSecret),
      ),
      columns: {
        id: true,
        organizationId: true,
        locationId: true,
        webhookSecret: true,
      },
    });
    if (!credential?.locationId || !credential.webhookSecret) {
      return unauthorized();
    }

    const rawBody = await readBoundedRawBody(request);
    if (
      !verifyCalComWebhookSignature({
        rawBody,
        secret: decrypt(credential.webhookSecret),
        signature: request.headers.get("x-cal-signature-256"),
      })
    ) {
      return unauthorized();
    }

    const parsedBody: unknown = JSON.parse(rawBody);
    const envelope = envelopeSchema.safeParse(parsedBody);
    if (!envelope.success) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook payload." },
        { status: 400 },
      );
    }
    if (!supportedEvents.has(envelope.data.triggerEvent)) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const event = calComWebhookEventSchema.safeParse(parsedBody);
    if (!event.success) {
      return NextResponse.json(
        { success: false, error: "Invalid booking event payload." },
        { status: 400 },
      );
    }

    const result = await applyCalComWebhook({
      scope: {
        credentialId: credential.id,
        organizationId: credential.organizationId,
        locationId: credential.locationId,
      },
      event: event.data,
      eventKey: calComWebhookEventKey(rawBody),
    });
    return NextResponse.json({
      success: true,
      duplicate: result.duplicate,
      outcome: result.outcome,
    });
  } catch (error) {
    if (error instanceof WebhookPayloadTooLargeError) {
      return NextResponse.json(
        { success: false, error: "Payload too large." },
        { status: 413 },
      );
    }
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook payload." },
        { status: 400 },
      );
    }

    await db
      .update(calComCredential)
      .set({
        lastWebhookError: "Webhook processing failed",
        updatedAt: new Date(),
      })
      .where(eq(calComCredential.id, credentialId))
      .catch(() => undefined);
    console.error("Cal.com webhook processing failed", { credentialId });
    return NextResponse.json(
      { success: false, error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Unauthorized." },
    { status: 401 },
  );
}
