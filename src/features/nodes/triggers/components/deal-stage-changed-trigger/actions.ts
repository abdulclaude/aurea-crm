"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { dealStageChangedTriggerChannel } from "@/inngest/channels/deal-stage-changed-trigger";

export type DealStageChangedTriggerToken = Realtime.Token<
  typeof dealStageChangedTriggerChannel,
  ["status"]
>;

export async function fetchDealStageChangedTriggerRealtimeToken(): Promise<DealStageChangedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: dealStageChangedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
