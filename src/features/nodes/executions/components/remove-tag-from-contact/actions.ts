"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { removeTagFromContactChannel } from "@/inngest/channels/remove-tag-from-contact";

export type RemoveTagFromContactToken = Realtime.Token<
  typeof removeTagFromContactChannel,
  ["status"]
>;

export async function fetchRemoveTagFromContactRealtimeToken(): Promise<RemoveTagFromContactToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: removeTagFromContactChannel(),
    topics: ["status"],
  });

  return token;
}
