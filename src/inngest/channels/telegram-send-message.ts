import { channel, topic } from "@inngest/realtime";

export const TELEGRAM_SEND_MESSAGE_CHANNEL_NAME = "telegram-send-message-execution";

export const telegramSendMessageChannel = channel(
  TELEGRAM_SEND_MESSAGE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
