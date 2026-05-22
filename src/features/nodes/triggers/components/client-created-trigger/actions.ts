"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { clientCreatedTriggerChannel } from "@/inngest/channels/client-created-trigger";

export type ClientCreatedTriggerToken = Realtime.Token<
  typeof clientCreatedTriggerChannel,
  ["status"]
>;

export async function fetchClientCreatedTriggerRealtimeToken(): Promise<ClientCreatedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: clientCreatedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
