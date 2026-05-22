"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { clientDeletedTriggerChannel } from "@/inngest/channels/client-deleted-trigger";

export type ClientDeletedTriggerToken = Realtime.Token<
  typeof clientDeletedTriggerChannel,
  ["status"]
>;

export async function fetchClientDeletedTriggerRealtimeToken(): Promise<ClientDeletedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: clientDeletedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
