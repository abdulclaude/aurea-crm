import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_TRIGGER_CHANNEL_NAME = "outlook-trigger";

export const outlookTriggerChannel = channel(OUTLOOK_TRIGGER_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
