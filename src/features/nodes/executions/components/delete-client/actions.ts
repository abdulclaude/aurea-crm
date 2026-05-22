"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { deleteClientChannel } from "@/inngest/channels/delete-client";

export type DeleteClientToken = Realtime.Token<
  typeof deleteClientChannel,
  ["status"]
>;

export async function fetchDeleteClientRealtimeToken(): Promise<DeleteClientToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: deleteClientChannel(),
    topics: ["status"],
  });

  return token;
}
