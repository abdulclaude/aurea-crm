import { channel, topic } from "@inngest/realtime";

export const DELETE_DEAL_CHANNEL_NAME = "delete-deal-execution";

export const deleteDealChannel = channel(
  DELETE_DEAL_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
