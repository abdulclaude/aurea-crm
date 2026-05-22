"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { updateClientChannel } from "@/inngest/channels/update-client";

export type UpdateClientToken = Realtime.Token<
  typeof updateClientChannel,
  ["status"]
>;

export async function fetchUpdateClientRealtimeToken(): Promise<UpdateClientToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: updateClientChannel(),
    topics: ["status"],
  });

  return token;
}
