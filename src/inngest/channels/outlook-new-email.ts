import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_NEW_EMAIL_CHANNEL_NAME = "outlook-new-email-trigger";

export const outlookNewEmailChannel = channel(
  OUTLOOK_NEW_EMAIL_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
