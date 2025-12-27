"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { dealUpdatedTriggerChannel } from "@/inngest/channels/deal-updated-trigger";

export type DealUpdatedTriggerToken = Realtime.Token<
  typeof dealUpdatedTriggerChannel,
  ["status"]
>;

export async function fetchDealUpdatedTriggerRealtimeToken(): Promise<DealUpdatedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: dealUpdatedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
