import { channel, topic } from "@inngest/realtime";

export const UPDATE_CLIENT_CHANNEL_NAME = "update-client-execution";

export const updateClientChannel = channel(
  UPDATE_CLIENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
