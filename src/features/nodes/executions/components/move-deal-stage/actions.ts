"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { moveDealStageChannel } from "@/inngest/channels/move-deal-stage";

export type MoveDealStageToken = Realtime.Token<
  typeof moveDealStageChannel,
  ["status"]
>;

export async function fetchMoveDealStageRealtimeToken(): Promise<MoveDealStageToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: moveDealStageChannel(),
    topics: ["status"],
  });

  return token;
}
