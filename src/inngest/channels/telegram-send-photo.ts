import { channel, topic } from "@inngest/realtime";

export const TELEGRAM_SEND_PHOTO_CHANNEL_NAME = "telegram-send-photo-execution";

export const telegramSendPhotoChannel = channel(
  TELEGRAM_SEND_PHOTO_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
