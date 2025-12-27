"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookReplyToEmailChannel } from "@/inngest/channels/outlook-reply-to-email";

export type OutlookReplyToEmailToken = Realtime.Token<
  typeof outlookReplyToEmailChannel,
  ["status"]
>;

export async function fetchOutlookReplyToEmailRealtimeToken(): Promise<OutlookReplyToEmailToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: outlookReplyToEmailChannel(),
    topics: ["status"],
  });

  return token;
}
