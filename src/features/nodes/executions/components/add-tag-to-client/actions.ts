"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { addTagToClientChannel } from "@/inngest/channels/add-tag-to-client";

export type AddTagToClientToken = Realtime.Token<
  typeof addTagToClientChannel,
  ["status"]
>;

export async function fetchAddTagToClientRealtimeToken(): Promise<AddTagToClientToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: addTagToClientChannel(),
    topics: ["status"],
  });

  return token;
}
