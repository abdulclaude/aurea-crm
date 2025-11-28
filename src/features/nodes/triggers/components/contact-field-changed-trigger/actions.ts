"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { contactFieldChangedTriggerChannel } from "@/inngest/channels/contact-field-changed-trigger";

export type ContactFieldChangedTriggerToken = Realtime.Token<
  typeof contactFieldChangedTriggerChannel,
  ["status"]
>;

export async function fetchContactFieldChangedTriggerRealtimeToken(): Promise<ContactFieldChangedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: contactFieldChangedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
