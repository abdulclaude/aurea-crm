"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { updateDealChannel } from "@/inngest/channels/update-deal";

export type UpdateDealToken = Realtime.Token<
  typeof updateDealChannel,
  ["status"]
>;

export async function fetchUpdateDealRealtimeToken(): Promise<UpdateDealToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: updateDealChannel(),
    topics: ["status"],
  });

  return token;
}
