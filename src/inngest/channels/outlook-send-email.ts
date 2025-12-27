import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_SEND_EMAIL_CHANNEL_NAME = "outlook-send-email-execution";

export const outlookSendEmailChannel = channel(
  OUTLOOK_SEND_EMAIL_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
