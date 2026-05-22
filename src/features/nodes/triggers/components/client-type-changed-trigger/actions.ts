"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { clientTypeChangedTriggerChannel } from "@/inngest/channels/client-type-changed-trigger";

export type ClientTypeChangedTriggerToken = Realtime.Token<
  typeof clientTypeChangedTriggerChannel,
  ["status"]
>;

export async function fetchClientTypeChangedTriggerRealtimeToken(): Promise<ClientTypeChangedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: clientTypeChangedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
