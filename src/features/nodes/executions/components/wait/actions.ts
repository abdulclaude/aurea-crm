"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { waitChannel } from "@/inngest/channels/wait";

export type WaitToken = Realtime.Token<typeof waitChannel, ["status"]>;

export async function fetchWaitRealtimeToken(): Promise<WaitToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: waitChannel(),
    topics: ["status"],
  });

  return token;
}
