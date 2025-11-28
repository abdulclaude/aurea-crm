"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { contactDeletedTriggerChannel } from "@/inngest/channels/contact-deleted-trigger";

export type ContactDeletedTriggerToken = Realtime.Token<
  typeof contactDeletedTriggerChannel,
  ["status"]
>;

export async function fetchContactDeletedTriggerRealtimeToken(): Promise<ContactDeletedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: contactDeletedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
