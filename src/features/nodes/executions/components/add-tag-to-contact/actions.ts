"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { addTagToContactChannel } from "@/inngest/channels/add-tag-to-contact";

export type AddTagToContactToken = Realtime.Token<
  typeof addTagToContactChannel,
  ["status"]
>;

export async function fetchAddTagToContactRealtimeToken(): Promise<AddTagToContactToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: addTagToContactChannel(),
    topics: ["status"],
  });

  return token;
}
