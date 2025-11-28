"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { deleteContactChannel } from "@/inngest/channels/delete-contact";

export type DeleteContactToken = Realtime.Token<
  typeof deleteContactChannel,
  ["status"]
>;

export async function fetchDeleteContactRealtimeToken(): Promise<DeleteContactToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: deleteContactChannel(),
    topics: ["status"],
  });

  return token;
}
