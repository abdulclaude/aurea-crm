"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { discordSendEmbedChannel } from "@/inngest/channels/discord-send-embed";

export type DiscordSendEmbedToken = Realtime.Token<
  typeof discordSendEmbedChannel,
  ["status"]
>;

export async function fetchDiscordSendEmbedRealtimeToken(): Promise<DiscordSendEmbedToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: discordSendEmbedChannel(),
    topics: ["status"],
  });

  return token;
}
