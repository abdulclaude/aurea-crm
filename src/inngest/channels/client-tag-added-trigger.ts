import { channel, topic } from "@inngest/realtime";

export const CLIENT_TAG_ADDED_TRIGGER_CHANNEL_NAME =
  "client-tag-added-trigger";

export const clientTagAddedTriggerChannel = channel(
  CLIENT_TAG_ADDED_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
