import { channel, topic } from "@inngest/realtime";

export const CREATE_DEAL_CHANNEL_NAME = "create-deal-execution";

export const createDealChannel = channel(
  CREATE_DEAL_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
