import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { enqueueGoogleCalendarNotification } from "@/features/google-calendar/server/subscriptions";

export async function POST(request: NextRequest) {
  try {
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceId = request.headers.get("x-goog-resource-id");
    const resourceState = request.headers.get("x-goog-resource-state");
    const channelToken = request.headers.get("x-goog-channel-token");
    const messageNumber = request.headers.get("x-goog-message-number");

    if (!channelId || !resourceId) {
      return NextResponse.json(
        { success: false, error: "Missing channel metadata." },
        { status: 400 }
      );
    }

    const subscription = await prisma.googleCalendarSubscription.findFirst({
      where: {
        channelId,
        resourceId,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: true, ignored: true },
        { status: 202 }
      );
    }

    if (
      subscription.webhookToken &&
      channelToken !== subscription.webhookToken
    ) {
      return NextResponse.json(
        { success: true, ignored: true },
        { status: 202 }
      );
    }

    if (resourceState === "sync") {
      await prisma.googleCalendarSubscription.update({
        where: { id: subscription.id },
        data: { lastSyncedAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    await enqueueGoogleCalendarNotification({
      subscriptionId: subscription.id,
      resourceState,
      messageNumber,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Google Calendar webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to handle Google Calendar webhook." },
      { status: 500 }
    );
  }
}
