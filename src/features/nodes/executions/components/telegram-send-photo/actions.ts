"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { telegramSendPhotoChannel } from "@/inngest/channels/telegram-send-photo";

export type TelegramSendPhotoToken = Realtime.Token<
  typeof telegramSendPhotoChannel,
  ["status"]
>;

export async function fetchTelegramSendPhotoRealtimeToken(): Promise<TelegramSendPhotoToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: telegramSendPhotoChannel(),
    topics: ["status"],
  });

  return token;
}
