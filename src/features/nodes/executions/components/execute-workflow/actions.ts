"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { executeWorkflowChannel } from "@/inngest/channels/execute-workflow";

export type ExecuteWorkflowToken = Realtime.Token<
  typeof executeWorkflowChannel,
  ["status"]
>;

export async function fetchExecuteWorkflowRealtimeToken(): Promise<ExecuteWorkflowToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: executeWorkflowChannel(),
    topics: ["status"],
  });

  return token;
}
