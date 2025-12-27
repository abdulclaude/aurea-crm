"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { dealDeletedTriggerChannel } from "@/inngest/channels/deal-deleted-trigger";

export type DealDeletedTriggerToken = Realtime.Token<
  typeof dealDeletedTriggerChannel,
  ["status"]
>;

export async function fetchDealDeletedTriggerRealtimeToken(): Promise<DealDeletedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: dealDeletedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
