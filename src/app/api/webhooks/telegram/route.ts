import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { credential as credentialTable } from "@/db/schema";
import { enqueueTelegramUpdate } from "@/features/telegram/server/enqueue";
import { eq } from "drizzle-orm";
import { z } from "zod";

const TelegramUpdateSchema = z.object({
  update_id: z.number(),
}).passthrough();

function getWebhookSecret(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const record = metadata as Record<string, unknown>;
  return typeof record.webhookSecret === "string"
    ? record.webhookSecret
    : undefined;
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
      .where(eq(credentialTable.id, credentialId))
      .limit(1);

    if (!credential) {
      return NextResponse.json(
        { success: false, error: "Credential not found." },
        { status: 404 }
      );
    }

    const expectedSecret = getWebhookSecret(credential.metadata);
    const providedSecret = request.headers.get(
      "x-telegram-bot-api-secret-token"
    );

    if (!expectedSecret || expectedSecret !== providedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const updatePayload: unknown = await request.json();
    const update = TelegramUpdateSchema.parse(updatePayload);

    await enqueueTelegramUpdate({
      credentialId,
      userId: credential.userId,
      update,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to handle Telegram webhook." },
      { status: 500 }
    );
  }
}
