import { channel, topic } from "@inngest/realtime";

export const SLACK_UPDATE_MESSAGE_CHANNEL_NAME = "slack-update-message-execution";

export const slackUpdateMessageChannel = channel(
  SLACK_UPDATE_MESSAGE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
