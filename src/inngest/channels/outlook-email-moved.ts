import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_EMAIL_MOVED_CHANNEL_NAME = "outlook-email-moved-trigger";

export const outlookEmailMovedChannel = channel(
  OUTLOOK_EMAIL_MOVED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
