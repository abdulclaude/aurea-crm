import { channel, topic } from "@inngest/realtime";

export const CLIENT_FIELD_CHANGED_TRIGGER_CHANNEL_NAME =
  "client-field-changed-trigger";

export const clientFieldChangedTriggerChannel = channel(
  CLIENT_FIELD_CHANGED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
