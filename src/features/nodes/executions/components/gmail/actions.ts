"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { gmailChannel } from "@/inngest/channels/gmail";

export type GmailExecutionToken = Realtime.Token<
  typeof gmailChannel,
  ["status"]
>;

export async function fetchGmailRealtimeToken(): Promise<GmailExecutionToken> {
  return getSubscriptionToken(inngest, {
    channel: gmailChannel(),
    topics: ["status"],
  });
}
