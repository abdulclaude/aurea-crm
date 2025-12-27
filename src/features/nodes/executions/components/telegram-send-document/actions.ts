"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { telegramSendDocumentChannel } from "@/inngest/channels/telegram-send-document";

export type TelegramSendDocumentToken = Realtime.Token<
  typeof telegramSendDocumentChannel,
  ["status"]
>;

export async function fetchTelegramSendDocumentRealtimeToken(): Promise<TelegramSendDocumentToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: telegramSendDocumentChannel(),
    topics: ["status"],
  });

  return token;
}
