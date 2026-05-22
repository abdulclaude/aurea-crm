import { channel, topic } from "@inngest/realtime";

export const DELETE_CLIENT_CHANNEL_NAME = "delete-client-execution";

export const deleteClientChannel = channel(
  DELETE_CLIENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
