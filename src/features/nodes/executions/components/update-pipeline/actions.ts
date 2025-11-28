"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { updatePipelineChannel } from "@/inngest/channels/update-pipeline";

export type UpdatePipelineToken = Realtime.Token<
  typeof updatePipelineChannel,
  ["status"]
>;

export async function fetchUpdatePipelineRealtimeToken(): Promise<UpdatePipelineToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: updatePipelineChannel(),
    topics: ["status"],
  });

  return token;
}
