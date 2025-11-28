"use server";

import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { oneDriveTriggerChannel } from "@/inngest/channels/onedrive-trigger";

export type OneDriveTriggerToken = Realtime.Token<
  typeof oneDriveTriggerChannel,
  ["status"]
>;

export async function fetchOneDriveTriggerRealtimeToken(): Promise<OneDriveTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: oneDriveTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
