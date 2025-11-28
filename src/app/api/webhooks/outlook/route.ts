import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { enqueueOutlookNotification } from "@/features/outlook/server/subscriptions";

export async function POST(request: NextRequest) {
  try {
    // Microsoft sends a validation token on subscription creation
    const validationToken = request.nextUrl.searchParams.get("validationToken");
    if (validationToken) {
      return new Response(validationToken, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Verify clientState matches what we sent
    const body = await request.json().catch(() => null);
    const notifications = body?.value;

    if (!Array.isArray(notifications)) {
      return NextResponse.json(
        { success: false, error: "Invalid notification payload." },
        { status: 400 }
      );
    }

    for (const notification of notifications) {
      if (notification.clientState !== "aurea-crm-outlook-webhook") {
        continue;
      }

      await enqueueOutlookNotification({
        subscriptionId: notification.subscriptionId,
        changeType: notification.changeType,
        resource: notification.resource,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Outlook webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to handle Outlook webhook." },
      { status: 500 }
    );
  }
}
