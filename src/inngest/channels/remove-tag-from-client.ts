import { channel, topic } from "@inngest/realtime";

export const REMOVE_TAG_FROM_CLIENT_CHANNEL_NAME = "remove-tag-from-client-execution";

export const removeTagFromClientChannel = channel(
  REMOVE_TAG_FROM_CLIENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
