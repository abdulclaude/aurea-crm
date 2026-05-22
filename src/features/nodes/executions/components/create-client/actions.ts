"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { createClientChannel } from "@/inngest/channels/create-client";

export type CreateClientToken = Realtime.Token<
  typeof createClientChannel,
  ["status"]
>;

export async function fetchCreateClientRealtimeToken(): Promise<CreateClientToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: createClientChannel(),
    topics: ["status"],
  });

  return token;
}
