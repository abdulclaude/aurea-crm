"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { discordSendDmChannel } from "@/inngest/channels/discord-send-dm";

export type DiscordSendDmToken = Realtime.Token<
  typeof discordSendDmChannel,
  ["status"]
>;

export async function fetchDiscordSendDmRealtimeToken(): Promise<DiscordSendDmToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: discordSendDmChannel(),
    topics: ["status"],
  });

  return token;
}
