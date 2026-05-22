"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { clientFieldChangedTriggerChannel } from "@/inngest/channels/client-field-changed-trigger";

export type ClientFieldChangedTriggerToken = Realtime.Token<
  typeof clientFieldChangedTriggerChannel,
  ["status"]
>;

export async function fetchClientFieldChangedTriggerRealtimeToken(): Promise<ClientFieldChangedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: clientFieldChangedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
