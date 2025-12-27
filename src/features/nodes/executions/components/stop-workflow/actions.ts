"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { stopWorkflowChannel } from "@/inngest/channels/stop-workflow";

export type StopWorkflowToken = Realtime.Token<
  typeof stopWorkflowChannel,
  ["status"]
>;

export async function fetchStopWorkflowRealtimeToken(): Promise<StopWorkflowToken> {
  return getSubscriptionToken(inngest, {
    channel: stopWorkflowChannel(),
    topics: ["status"],
  });
}
