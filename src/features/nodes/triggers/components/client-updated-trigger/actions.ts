"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { clientUpdatedTriggerChannel } from "@/inngest/channels/client-updated-trigger";

export type ClientUpdatedTriggerToken = Realtime.Token<
  typeof clientUpdatedTriggerChannel,
  ["status"]
>;

export async function fetchClientUpdatedTriggerRealtimeToken(): Promise<ClientUpdatedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: clientUpdatedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
