"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookEmailMovedChannel } from "@/inngest/channels/outlook-email-moved";

export type OutlookEmailMovedToken = Realtime.Token<
  typeof outlookEmailMovedChannel,
  ["status"]
>;

export async function fetchOutlookEmailMovedRealtimeToken(): Promise<OutlookEmailMovedToken> {
  return getSubscriptionToken(inngest, {
    channel: outlookEmailMovedChannel(),
    topics: ["status"],
  });
}
