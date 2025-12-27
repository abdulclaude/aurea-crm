"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { slackUpdateMessageChannel } from "@/inngest/channels/slack-update-message";

export type SlackUpdateMessageToken = Realtime.Token<
  typeof slackUpdateMessageChannel,
  ["status"]
>;

export async function fetchSlackUpdateMessageRealtimeToken(): Promise<SlackUpdateMessageToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: slackUpdateMessageChannel(),
    topics: ["status"],
  });

  return token;
}
