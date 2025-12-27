"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { slackSendMessageChannel } from "@/inngest/channels/slack-send-message";

export type SlackSendMessageToken = Realtime.Token<
  typeof slackSendMessageChannel,
  ["status"]
>;

export async function fetchSlackSendMessageRealtimeToken(): Promise<SlackSendMessageToken> {
  return getSubscriptionToken(inngest, {
    channel: slackSendMessageChannel(),
    topics: ["status"],
  });
}
