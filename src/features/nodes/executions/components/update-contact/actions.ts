"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { updateContactChannel } from "@/inngest/channels/update-contact";

export type UpdateContactToken = Realtime.Token<
  typeof updateContactChannel,
  ["status"]
>;

export async function fetchUpdateContactRealtimeToken(): Promise<UpdateContactToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: updateContactChannel(),
    topics: ["status"],
  });

  return token;
}
