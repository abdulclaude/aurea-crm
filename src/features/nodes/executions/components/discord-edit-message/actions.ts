"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { discordEditMessageChannel } from "@/inngest/channels/discord-edit-message";

export type DiscordEditMessageToken = Realtime.Token<
  typeof discordEditMessageChannel,
  ["status"]
>;

export async function fetchDiscordEditMessageRealtimeToken(): Promise<DiscordEditMessageToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: discordEditMessageChannel(),
    topics: ["status"],
  });

  return token;
}
