"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { contactUpdatedTriggerChannel } from "@/inngest/channels/contact-updated-trigger";

export type ContactUpdatedTriggerToken = Realtime.Token<
  typeof contactUpdatedTriggerChannel,
  ["status"]
>;

export async function fetchContactUpdatedTriggerRealtimeToken(): Promise<ContactUpdatedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: contactUpdatedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
