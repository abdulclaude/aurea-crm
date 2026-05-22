import { channel, topic } from "@inngest/realtime";

export const CLIENT_DELETED_TRIGGER_CHANNEL_NAME = "client-deleted-trigger";

export const clientDeletedTriggerChannel = channel(
  CLIENT_DELETED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
