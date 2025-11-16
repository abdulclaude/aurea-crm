import { Buffer } from "node:buffer";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@/lib/db";
import { enqueueGmailNotification } from "@/features/gmail/server/subscriptions";

const VERIFY_TOKEN = process.env.GMAIL_PUBSUB_VERIFICATION_TOKEN;

export async function POST(request: NextRequest) {
  try {
    if (VERIFY_TOKEN) {
      const token = request.nextUrl.searchParams.get("token");
      if (token !== VERIFY_TOKEN) {
        return NextResponse.json(
          { success: false, error: "Invalid verification token." },
          { status: 401 }
        );
      }
    }

    const body = await request.json().catch(() => null);
    const message = body?.message;

    if (!message?.data) {
      return NextResponse.json(
        { success: false, error: "Missing Pub/Sub message payload." },
        { status: 400 }
      );
    }

    const decoded = decodeMessageData(message.data);
    const emailAddress = decoded?.emailAddress;
    const historyId = decoded?.historyId;

    if (!emailAddress) {
      return NextResponse.json(
        { success: false, error: "Missing email address in message." },
        { status: 400 }
      );
    }

    const subscription = await prisma.gmailSubscription.findFirst({
      where: { emailAddress },
    });

    if (!subscription) {
      return NextResponse.json({ success: true, ignored: true }, { status: 202 });
    }

    await enqueueGmailNotification({
      subscriptionId: subscription.id,
      historyId: historyId ? String(historyId) : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gmail webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to handle Gmail webhook." },
      { status: 500 }
    );
  }
}

function decodeMessageData(data: string) {
  try {
    const buffer = Buffer.from(data, "base64");
    return JSON.parse(buffer.toString("utf-8"));
  } catch {
    return null;
  }
}

