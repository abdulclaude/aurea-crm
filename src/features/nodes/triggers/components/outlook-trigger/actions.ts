"use server";

import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { outlookTriggerChannel } from "@/inngest/channels/outlook-trigger";

export type OutlookTriggerToken = Realtime.Token<
  typeof outlookTriggerChannel,
  ["status"]
>;

export async function fetchOutlookTriggerRealtimeToken(): Promise<OutlookTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: outlookTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
