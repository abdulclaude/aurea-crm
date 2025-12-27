"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { gmailSendEmailChannel } from "@/inngest/channels/gmail-send-email";

export type GmailSendEmailToken = Realtime.Token<
  typeof gmailSendEmailChannel,
  ["status"]
>;

export async function fetchGmailSendEmailRealtimeToken(): Promise<GmailSendEmailToken> {
  return getSubscriptionToken(inngest, {
    channel: gmailSendEmailChannel(),
    topics: ["status"],
  });
}
