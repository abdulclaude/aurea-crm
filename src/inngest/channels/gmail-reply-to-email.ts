import { channel, topic } from "@inngest/realtime";

export const GMAIL_REPLY_TO_EMAIL_CHANNEL_NAME = "gmail-reply-to-email";

export const gmailReplyToEmailChannel = channel(GMAIL_REPLY_TO_EMAIL_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
