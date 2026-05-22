import { channel, topic } from "@inngest/realtime";

export const FIND_CLIENTS_CHANNEL_NAME = "find-clients";

export const findClientsChannel = channel(FIND_CLIENTS_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
