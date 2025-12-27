"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { discordNewReactionChannel } from "@/inngest/channels/discord-new-reaction";

export type DiscordNewReactionToken = Realtime.Token<
  typeof discordNewReactionChannel,
  ["status"]
>;

export async function fetchDiscordNewReactionRealtimeToken(): Promise<DiscordNewReactionToken> {
  return getSubscriptionToken(inngest, {
    channel: discordNewReactionChannel(),
    topics: ["status"],
  });
}
