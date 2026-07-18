import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  authenticateOneDriveNotifications,
  enqueueOneDriveNotifications,
} from "@/features/onedrive/server/subscriptions";
import {
  MAX_MICROSOFT_NOTIFICATION_BYTES,
  microsoftChangeNotificationCollectionSchema,
  microsoftValidationTokenSchema,
} from "@/features/microsoft/lib/subscription-contracts";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  const validationToken = request.nextUrl.searchParams.get("validationToken");
  if (validationToken !== null) {
    const parsed = microsoftValidationTokenSchema.safeParse(validationToken);
    return parsed.success
      ? new Response(parsed.data, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        })
      : NextResponse.json(
          { success: false, error: "Invalid validation token." },
          { status: 400 },
        );
  }

  try {
    const rawBody = await readBoundedRawBody(
      request,
      MAX_MICROSOFT_NOTIFICATION_BYTES,
    );
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid notification payload." },
        { status: 400 },
      );
    }

    const parsed =
      microsoftChangeNotificationCollectionSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid notification payload." },
        { status: 400 },
      );
    }

    const notifications = await authenticateOneDriveNotifications(
      parsed.data.value,
    );
    await enqueueOneDriveNotifications(notifications);

    return NextResponse.json(
      { success: true, accepted: notifications.length },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof WebhookPayloadTooLargeError) {
      return NextResponse.json(
        { success: false, error: "Notification payload too large." },
        { status: 413 },
      );
    }

    console.error("OneDrive webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to handle OneDrive webhook." },
      { status: 500 },
    );
  }
}
