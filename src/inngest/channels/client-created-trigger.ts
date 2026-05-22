import { channel, topic } from "@inngest/realtime";

export const CLIENT_CREATED_TRIGGER_CHANNEL_NAME = "client-created-trigger";

export const clientCreatedTriggerChannel = channel(
  CLIENT_CREATED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
