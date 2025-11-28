"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { deleteDealChannel } from "@/inngest/channels/delete-deal";

export type DeleteDealToken = Realtime.Token<
  typeof deleteDealChannel,
  ["status"]
>;

export async function fetchDeleteDealRealtimeToken(): Promise<DeleteDealToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: deleteDealChannel(),
    topics: ["status"],
  });

  return token;
}
