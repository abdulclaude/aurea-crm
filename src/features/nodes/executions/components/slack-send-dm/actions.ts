"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { slackSendDmChannel } from "@/inngest/channels/slack-send-dm";

export type SlackSendDmToken = Realtime.Token<
  typeof slackSendDmChannel,
  ["status"]
>;

export async function fetchSlackSendDmRealtimeToken(): Promise<SlackSendDmToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: slackSendDmChannel(),
    topics: ["status"],
  });

  return token;
}
