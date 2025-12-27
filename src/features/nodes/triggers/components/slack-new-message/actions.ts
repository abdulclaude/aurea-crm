"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { slackNewMessageChannel } from "@/inngest/channels/slack-new-message";

export type SlackNewMessageToken = Realtime.Token<
  typeof slackNewMessageChannel,
  ["status"]
>;

export async function fetchSlackNewMessageRealtimeToken(): Promise<SlackNewMessageToken> {
  return getSubscriptionToken(inngest, {
    channel: slackNewMessageChannel(),
    topics: ["status"],
  });
}
