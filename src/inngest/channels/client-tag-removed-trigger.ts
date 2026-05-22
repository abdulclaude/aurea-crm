import { channel, topic } from "@inngest/realtime";

export const CLIENT_TAG_REMOVED_TRIGGER_CHANNEL_NAME =
  "client-tag-removed-trigger";

export const clientTagRemovedTriggerChannel = channel(
  CLIENT_TAG_REMOVED_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
