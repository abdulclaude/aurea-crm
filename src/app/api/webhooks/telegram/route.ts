import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@/lib/db";
import { enqueueTelegramUpdate } from "@/features/telegram/server/enqueue";

export async function POST(request: NextRequest) {
  try {
    const credentialId = request.nextUrl.searchParams.get("credentialId");
    if (!credentialId) {
      return NextResponse.json(
        { success: false, error: "Missing credential reference." },
        { status: 400 }
      );
    }

    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      return NextResponse.json(
        { success: false, error: "Credential not found." },
        { status: 404 }
      );
    }

    const expectedSecret = (
      credential.metadata as { webhookSecret?: string } | null | undefined
    )?.webhookSecret;
    const providedSecret = request.headers.get(
      "x-telegram-bot-api-secret-token"
    );

    if (!expectedSecret || expectedSecret !== providedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const update = await request.json();

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
