"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { createContactChannel } from "@/inngest/channels/create-contact";

export type CreateContactToken = Realtime.Token<
  typeof createContactChannel,
  ["status"]
>;

export async function fetchCreateContactRealtimeToken(): Promise<CreateContactToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: createContactChannel(),
    topics: ["status"],
  });

  return token;
}
