"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { createDealChannel } from "@/inngest/channels/create-deal";

export type CreateDealToken = Realtime.Token<
  typeof createDealChannel,
  ["status"]
>;

export async function fetchCreateDealRealtimeToken(): Promise<CreateDealToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: createDealChannel(),
    topics: ["status"],
  });

  return token;
}
