import { channel, topic } from "@inngest/realtime";

export const CALCULATE_CHURN_SCORE_CHANNEL_NAME =
  "calculate-churn-score-execution";

export const calculateChurnScoreChannel = channel(
  CALCULATE_CHURN_SCORE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
