"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { discordSendMessageChannel } from "@/inngest/channels/discord-send-message";

export type DiscordSendMessageToken = Realtime.Token<
  typeof discordSendMessageChannel,
  ["status"]
>;

export async function fetchDiscordSendMessageRealtimeToken(): Promise<DiscordSendMessageToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: discordSendMessageChannel(),
    topics: ["status"],
  });

  return token;
}
