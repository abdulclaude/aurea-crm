"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { gmailReplyToEmailChannel } from "@/inngest/channels/gmail-reply-to-email";

export type GmailReplyToEmailToken = Realtime.Token<
  typeof gmailReplyToEmailChannel,
  ["status"]
>;

export async function fetchGmailReplyToEmailRealtimeToken(): Promise<GmailReplyToEmailToken> {
  return getSubscriptionToken(inngest, {
    channel: gmailReplyToEmailChannel(),
    topics: ["status"],
  });
}
