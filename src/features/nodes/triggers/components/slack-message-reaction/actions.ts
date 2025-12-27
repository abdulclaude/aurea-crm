"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { slackMessageReactionChannel } from "@/inngest/channels/slack-message-reaction";

export type SlackMessageReactionToken = Realtime.Token<
  typeof slackMessageReactionChannel,
  ["status"]
>;

export async function fetchSlackMessageReactionRealtimeToken(): Promise<SlackMessageReactionToken> {
  return getSubscriptionToken(inngest, {
    channel: slackMessageReactionChannel(),
    topics: ["status"],
  });
}
