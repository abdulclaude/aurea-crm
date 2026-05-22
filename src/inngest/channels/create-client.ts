import { channel, topic } from "@inngest/realtime";

export const CREATE_CLIENT_CHANNEL_NAME = "create-client-execution";

export const createClientChannel = channel(
  CREATE_CLIENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
