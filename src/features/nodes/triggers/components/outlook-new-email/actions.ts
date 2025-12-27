"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookNewEmailChannel } from "@/inngest/channels/outlook-new-email";

export type OutlookNewEmailToken = Realtime.Token<
  typeof outlookNewEmailChannel,
  ["status"]
>;

export async function fetchOutlookNewEmailRealtimeToken(): Promise<OutlookNewEmailToken> {
  return getSubscriptionToken(inngest, {
    channel: outlookNewEmailChannel(),
    topics: ["status"],
  });
}
