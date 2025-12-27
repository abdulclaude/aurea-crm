"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { telegramCommandReceivedChannel } from "@/inngest/channels/telegram-command-received";

export type TelegramCommandReceivedToken = Realtime.Token<
  typeof telegramCommandReceivedChannel,
  ["status"]
>;

export async function fetchTelegramCommandReceivedRealtimeToken(): Promise<TelegramCommandReceivedToken> {
  return getSubscriptionToken(inngest, {
    channel: telegramCommandReceivedChannel(),
    topics: ["status"],
  });
}
