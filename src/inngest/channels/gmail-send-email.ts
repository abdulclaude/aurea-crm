import { channel, topic } from "@inngest/realtime";

export const GMAIL_SEND_EMAIL_CHANNEL_NAME = "gmail-send-email";

export const gmailSendEmailChannel = channel(GMAIL_SEND_EMAIL_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
