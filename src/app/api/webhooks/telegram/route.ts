import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

import { db } from "@/db";
import { credential as credentialTable } from "@/db/schema";
import { enqueueTelegramUpdate } from "@/features/telegram/server/enqueue";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";

const TelegramUpdateSchema = z.object({
  update_id: z.number(),
}).passthrough();

function getWebhookSecretHash(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const record = metadata as Record<string, unknown>;
  return typeof record.webhookSecretHash === "string"
    ? record.webhookSecretHash
    : undefined;
}

function secretMatches(expectedHash: string, provided: string | null): boolean {
  if (!provided) return false;
  const actual = createHash("sha256").update(provided).digest();
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(request: NextRequest) {
  try {
    const credentialId = request.nextUrl.searchParams.get("credentialId");
    if (!credentialId) {
      return NextResponse.json(
        { success: false, error: "Missing credential reference." },
        { status: 400 }
      );
    }

    const [credential] = await db
      .select()
      .from(credentialTable)
      .where(
        and(
          eq(credentialTable.id, credentialId),
          eq(credentialTable.type, "TELEGRAM_BOT"),
          eq(credentialTable.isActive, true),
        ),
      )
      .limit(1);

    if (!credential) {
      return NextResponse.json(
        { success: false, error: "Credential not found." },
        { status: 404 }
      );
    }

    const expectedSecretHash = getWebhookSecretHash(credential.metadata);
    const providedSecret = request.headers.get(
      "x-telegram-bot-api-secret-token"
    );

    if (!expectedSecretHash || !secretMatches(expectedSecretHash, providedSecret)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const rawBody = await readBoundedRawBody(request);
    const updatePayload: unknown = JSON.parse(rawBody);
    const update = TelegramUpdateSchema.parse(updatePayload);

    await enqueueTelegramUpdate({
      credentialId,
      organizationId: credential.organizationId,
      locationId: credential.locationId,
      update,
    });

    return NextResponse.json({ success: true });
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
    console.error("Telegram webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to handle Telegram webhook." },
      { status: 500 }
    );
  }
}
