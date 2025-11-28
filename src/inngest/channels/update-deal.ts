import { channel, topic } from "@inngest/realtime";

export const UPDATE_DEAL_CHANNEL_NAME = "update-deal-execution";

export const updateDealChannel = channel(
  UPDATE_DEAL_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
