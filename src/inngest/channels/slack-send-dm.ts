import { channel, topic } from "@inngest/realtime";

export const SLACK_SEND_DM_CHANNEL_NAME = "slack-send-dm-execution";

export const slackSendDmChannel = channel(
  SLACK_SEND_DM_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
