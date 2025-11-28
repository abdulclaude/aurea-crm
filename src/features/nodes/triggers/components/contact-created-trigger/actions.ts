"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { contactCreatedTriggerChannel } from "@/inngest/channels/contact-created-trigger";

export type ContactCreatedTriggerToken = Realtime.Token<
  typeof contactCreatedTriggerChannel,
  ["status"]
>;

export async function fetchContactCreatedTriggerRealtimeToken(): Promise<ContactCreatedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: contactCreatedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
