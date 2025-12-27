import { channel, topic } from "@inngest/realtime";

export const TELEGRAM_SEND_DOCUMENT_CHANNEL_NAME = "telegram-send-document-execution";

export const telegramSendDocumentChannel = channel(
  TELEGRAM_SEND_DOCUMENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
