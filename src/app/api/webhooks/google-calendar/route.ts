import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { googleCalendarSubscription, providerAccount } from "@/db/schema";
import {
  enqueueGoogleCalendarNotification,
} from "@/features/google-calendar/server/subscriptions";
import {
  isNewGoogleMessageNumber,
  webhookSecretMatches,
} from "@/features/google-calendar/server/subscription-contracts";

const HEADER_LIMITS = {
  channelId: 200,
  resourceId: 1_000,
  resourceState: 100,
  channelToken: 500,
  messageNumber: 40,
} as const;

export async function POST(request: NextRequest) {
  const channelId = boundedHeader(request, "x-goog-channel-id", HEADER_LIMITS.channelId);
  const resourceId = boundedHeader(request, "x-goog-resource-id", HEADER_LIMITS.resourceId);
  const resourceState = boundedHeader(
    request,
    "x-goog-resource-state",
    HEADER_LIMITS.resourceState,
  );
  const channelToken = boundedHeader(
    request,
    "x-goog-channel-token",
    HEADER_LIMITS.channelToken,
  );
  const messageNumber = boundedHeader(
    request,
    "x-goog-message-number",
    HEADER_LIMITS.messageNumber,
  );
  if (!channelId || !resourceId || !channelToken || !messageNumber) {
    return NextResponse.json({ error: "Invalid channel metadata." }, { status: 400 });
  }

  try {
    const [row] = await db
      .select({ subscription: googleCalendarSubscription })
      .from(googleCalendarSubscription)
      .innerJoin(
        providerAccount,
        and(
          eq(providerAccount.id, googleCalendarSubscription.providerAccountId),
          eq(providerAccount.organizationId, googleCalendarSubscription.organizationId),
        ),
      )
      .where(
        and(
          eq(googleCalendarSubscription.channelId, channelId),
          eq(googleCalendarSubscription.resourceId, resourceId),
          eq(providerAccount.status, "ACTIVE"),
        ),
      )
      .limit(1);
    if (!row) return NextResponse.json({ accepted: true }, { status: 202 });

    const subscription = row.subscription;
    if (!webhookSecretMatches(channelToken, subscription.webhookTokenHash)) {
      return NextResponse.json({ error: "Invalid channel token." }, { status: 401 });
    }
    if (!isNewGoogleMessageNumber(messageNumber, subscription.lastMessageNumber)) {
      return NextResponse.json({ accepted: true }, { status: 202 });
    }

    if (resourceState !== "sync") {
      await enqueueGoogleCalendarNotification({
        subscriptionId: subscription.id,
        resourceState,
        messageNumber,
      });
    }
    await db
      .update(googleCalendarSubscription)
      .set({
        lastMessageNumber: messageNumber,
        lastSyncedAt: resourceState === "sync" ? new Date() : subscription.lastSyncedAt,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarSubscription.id, subscription.id));
    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error) {
    console.error("[GoogleCalendar] Webhook intake failed.", error);
    return NextResponse.json({ error: "Webhook intake failed." }, { status: 500 });
  }
}

function boundedHeader(
  request: NextRequest,
  name: string,
  maxLength: number,
): string | null {
  const value = request.headers.get(name);
  return value && value.length <= maxLength ? value : null;
}
