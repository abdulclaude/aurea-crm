"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

import { inngest } from "@/inngest/client";
import { telegramTriggerChannel } from "@/inngest/channels/telegram-trigger";

export type TelegramTriggerRealtimeToken = Realtime.Token<
  typeof telegramTriggerChannel,
  ["status"]
>;

export async function fetchTelegramTriggerRealtimeToken(): Promise<TelegramTriggerRealtimeToken> {
  return getSubscriptionToken(inngest, {
    channel: telegramTriggerChannel(),
    topics: ["status"],
  });
}
