"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { slackChannelJoinedChannel } from "@/inngest/channels/slack-channel-joined";

export type SlackChannelJoinedToken = Realtime.Token<
  typeof slackChannelJoinedChannel,
  ["status"]
>;

export async function fetchSlackChannelJoinedRealtimeToken(): Promise<SlackChannelJoinedToken> {
  return getSubscriptionToken(inngest, {
    channel: slackChannelJoinedChannel(),
    topics: ["status"],
  });
}
