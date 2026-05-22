import { channel, topic } from "@inngest/realtime";

export const ADD_TAG_TO_CLIENT_CHANNEL_NAME = "add-tag-to-client-execution";

export const addTagToClientChannel = channel(
  ADD_TAG_TO_CLIENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
