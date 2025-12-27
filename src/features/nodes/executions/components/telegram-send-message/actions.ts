"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { telegramSendMessageChannel } from "@/inngest/channels/telegram-send-message";

export type TelegramSendMessageToken = Realtime.Token<
  typeof telegramSendMessageChannel,
  ["status"]
>;

export async function fetchTelegramSendMessageRealtimeToken(): Promise<TelegramSendMessageToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: telegramSendMessageChannel(),
    topics: ["status"],
  });

  return token;
}
