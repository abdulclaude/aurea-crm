"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { discordNewMessageChannel } from "@/inngest/channels/discord-new-message";

export type DiscordNewMessageToken = Realtime.Token<
  typeof discordNewMessageChannel,
  ["status"]
>;

export async function fetchDiscordNewMessageRealtimeToken(): Promise<DiscordNewMessageToken> {
  return getSubscriptionToken(inngest, {
    channel: discordNewMessageChannel(),
    topics: ["status"],
  });
}
