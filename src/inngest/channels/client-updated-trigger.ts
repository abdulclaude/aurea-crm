import { channel, topic } from "@inngest/realtime";

export const CLIENT_UPDATED_TRIGGER_CHANNEL_NAME = "client-updated-trigger";

export const clientUpdatedTriggerChannel = channel(
  CLIENT_UPDATED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
