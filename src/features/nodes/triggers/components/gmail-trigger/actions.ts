"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { gmailTriggerChannel } from "@/inngest/channels/gmail-trigger";

export type GmailTriggerToken = Realtime.Token<
  typeof gmailTriggerChannel,
  ["status"]
>;

export async function fetchGmailTriggerRealtimeToken(): Promise<GmailTriggerToken> {
  return getSubscriptionToken(inngest, {
    channel: gmailTriggerChannel(),
    topics: ["status"],
  });
}
