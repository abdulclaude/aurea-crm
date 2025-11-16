"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

import { inngest } from "@/inngest/client";
import { telegramChannel } from "@/inngest/channels/telegram";

export type TelegramExecutionRealtimeToken = Realtime.Token<
  typeof telegramChannel,
  ["status"]
>;

export async function fetchTelegramExecutionRealtimeToken(): Promise<TelegramExecutionRealtimeToken> {
  return getSubscriptionToken(inngest, {
    channel: telegramChannel(),
    topics: ["status"],
  });
}
