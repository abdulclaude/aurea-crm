"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { discordUserJoinedChannel } from "@/inngest/channels/discord-user-joined";

export type DiscordUserJoinedToken = Realtime.Token<
  typeof discordUserJoinedChannel,
  ["status"]
>;

export async function fetchDiscordUserJoinedRealtimeToken(): Promise<DiscordUserJoinedToken> {
  return getSubscriptionToken(inngest, {
    channel: discordUserJoinedChannel(),
    topics: ["status"],
  });
}
