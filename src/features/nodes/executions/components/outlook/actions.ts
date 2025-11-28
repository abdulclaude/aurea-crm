"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookChannel } from "@/inngest/channels/outlook";

export type OutlookExecutionToken = Realtime.Token<
  typeof outlookChannel,
  ["status"]
>;

export async function fetchOutlookRealtimeToken(): Promise<OutlookExecutionToken> {
  return getSubscriptionToken(inngest, {
    channel: outlookChannel(),
    topics: ["status"],
  });
}
