import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_CHANNEL_NAME = "outlook-execution";

export const outlookChannel = channel(OUTLOOK_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
