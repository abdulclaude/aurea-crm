import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@/lib/db";
import { IntegrationProvider } from "@/generated/prisma/enums";
import { enqueueWhatsAppUpdate } from "@/features/whatsapp/server/enqueue";

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || "";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    if (!VERIFY_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Verify token not configured." },
        { status: 500 }
      );
    }

    if (token === VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json(
      { success: false, error: "Verify token mismatch." },
      { status: 403 }
    );
  }

  return NextResponse.json(
    { success: false, error: "Invalid request." },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body?.entry) {
      return NextResponse.json({ success: true });
    }

    for (const entry of body.entry ?? []) {
      const changes = entry.changes ?? [];

      for (const change of changes) {
        const phoneNumberId = change?.value?.metadata?.phone_number_id;
        if (!phoneNumberId) {
          continue;
        }

        const integration = await prisma.integration.findFirst({
          where: {
            provider: IntegrationProvider.WHATSAPP,
            metadata: {
              path: ["phoneNumberId"],
              equals: phoneNumberId,
            },
          },
        });

        if (!integration) {
          continue;
        }

        await enqueueWhatsAppUpdate({
          integrationId: integration.id,
          userId: integration.userId,
          payload: change,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to handle WhatsApp webhook." },
      { status: 500 }
    );
  }
}
