import { channel, topic } from "@inngest/realtime";

export const AWARD_LOYALTY_POINTS_CHANNEL_NAME =
  "award-loyalty-points-execution";

export const awardLoyaltyPointsChannel = channel(
  AWARD_LOYALTY_POINTS_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
