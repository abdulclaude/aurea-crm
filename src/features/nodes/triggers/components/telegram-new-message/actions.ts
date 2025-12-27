"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { telegramTriggerChannel } from "@/inngest/channels/telegram-trigger";

export type TelegramNewMessageToken = Realtime.Token<
  typeof telegramTriggerChannel,
  ["status"]
>;

export async function fetchTelegramNewMessageRealtimeToken(): Promise<TelegramNewMessageToken> {
  return getSubscriptionToken(inngest, {
    channel: telegramTriggerChannel(),
    topics: ["status"],
  });
}
