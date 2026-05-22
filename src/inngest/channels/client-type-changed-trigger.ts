import { channel, topic } from "@inngest/realtime";

export const CLIENT_TYPE_CHANGED_TRIGGER_CHANNEL_NAME =
  "client-type-changed-trigger";

export const clientTypeChangedTriggerChannel = channel(
  CLIENT_TYPE_CHANGED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
