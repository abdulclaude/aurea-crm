"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { removeTagFromClientChannel } from "@/inngest/channels/remove-tag-from-client";

export type RemoveTagFromClientToken = Realtime.Token<
  typeof removeTagFromClientChannel,
  ["status"]
>;

export async function fetchRemoveTagFromClientRealtimeToken(): Promise<RemoveTagFromClientToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: removeTagFromClientChannel(),
    topics: ["status"],
  });

  return token;
}
