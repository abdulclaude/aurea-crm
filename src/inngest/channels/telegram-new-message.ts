import { channel, topic } from "@inngest/realtime";

export const TELEGRAM_NEW_MESSAGE_CHANNEL_NAME = "telegram-new-message-trigger";

export const telegramNewMessageChannel = channel(
  TELEGRAM_NEW_MESSAGE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
