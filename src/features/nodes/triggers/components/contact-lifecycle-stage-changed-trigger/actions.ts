"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { contactLifecycleStageChangedTriggerChannel } from "@/inngest/channels/contact-lifecycle-stage-changed-trigger";

export type ContactLifecycleStageChangedTriggerToken = Realtime.Token<
  typeof contactLifecycleStageChangedTriggerChannel,
  ["status"]
>;

export async function fetchContactLifecycleStageChangedTriggerRealtimeToken(): Promise<ContactLifecycleStageChangedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: contactLifecycleStageChangedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
