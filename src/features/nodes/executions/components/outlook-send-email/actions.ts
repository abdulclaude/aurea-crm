"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookSendEmailChannel } from "@/inngest/channels/outlook-send-email";

export type OutlookSendEmailToken = Realtime.Token<
  typeof outlookSendEmailChannel,
  ["status"]
>;

export async function fetchOutlookSendEmailRealtimeToken(): Promise<OutlookSendEmailToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: outlookSendEmailChannel(),
    topics: ["status"],
  });

  return token;
}
