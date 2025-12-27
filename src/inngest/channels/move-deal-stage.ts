import { channel, topic } from "@inngest/realtime";

export const MOVE_DEAL_STAGE_CHANNEL_NAME = "move-deal-stage-execution";

export const moveDealStageChannel = channel(
  MOVE_DEAL_STAGE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
