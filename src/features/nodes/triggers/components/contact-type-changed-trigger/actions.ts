"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { contactTypeChangedTriggerChannel } from "@/inngest/channels/contact-type-changed-trigger";

export type ContactTypeChangedTriggerToken = Realtime.Token<
  typeof contactTypeChangedTriggerChannel,
  ["status"]
>;

export async function fetchContactTypeChangedTriggerRealtimeToken(): Promise<ContactTypeChangedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: contactTypeChangedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
