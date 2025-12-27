import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_REPLY_TO_EMAIL_CHANNEL_NAME = "outlook-reply-to-email-execution";

export const outlookReplyToEmailChannel = channel(
  OUTLOOK_REPLY_TO_EMAIL_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
