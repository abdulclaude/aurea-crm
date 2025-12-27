import { channel, topic } from "@inngest/realtime";

export const TELEGRAM_COMMAND_RECEIVED_CHANNEL_NAME = "telegram-command-received-trigger";

export const telegramCommandReceivedChannel = channel(
  TELEGRAM_COMMAND_RECEIVED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
