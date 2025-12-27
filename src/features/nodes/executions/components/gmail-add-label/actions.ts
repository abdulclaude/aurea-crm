"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { gmailAddLabelChannel } from "@/inngest/channels/gmail-add-label";

export type GmailAddLabelToken = Realtime.Token<
  typeof gmailAddLabelChannel,
  ["status"]
>;

export async function fetchGmailAddLabelRealtimeToken(): Promise<GmailAddLabelToken> {
  return getSubscriptionToken(inngest, {
    channel: gmailAddLabelChannel(),
    topics: ["status"],
  });
}
