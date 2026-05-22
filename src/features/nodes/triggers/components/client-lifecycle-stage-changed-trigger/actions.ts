"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { clientLifecycleStageChangedTriggerChannel } from "@/inngest/channels/client-lifecycle-stage-changed-trigger";

export type ClientLifecycleStageChangedTriggerToken = Realtime.Token<
  typeof clientLifecycleStageChangedTriggerChannel,
  ["status"]
>;

export async function fetchClientLifecycleStageChangedTriggerRealtimeToken(): Promise<ClientLifecycleStageChangedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: clientLifecycleStageChangedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
