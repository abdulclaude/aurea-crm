"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { gmailSearchEmailsChannel } from "@/inngest/channels/gmail-search-emails";

export type GmailSearchEmailsToken = Realtime.Token<
  typeof gmailSearchEmailsChannel,
  ["status"]
>;

export async function fetchGmailSearchEmailsRealtimeToken(): Promise<GmailSearchEmailsToken> {
  return getSubscriptionToken(inngest, {
    channel: gmailSearchEmailsChannel(),
    topics: ["status"],
  });
}
