"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { dealCreatedTriggerChannel } from "@/inngest/channels/deal-created-trigger";

export type DealCreatedTriggerToken = Realtime.Token<
  typeof dealCreatedTriggerChannel,
  ["status"]
>;

export async function fetchDealCreatedTriggerRealtimeToken(): Promise<DealCreatedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: dealCreatedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
