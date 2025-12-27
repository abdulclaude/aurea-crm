import { channel, topic } from "@inngest/realtime";

export const SLACK_NEW_MESSAGE_CHANNEL_NAME = "slack-new-message-trigger";

export const slackNewMessageChannel = channel(
  SLACK_NEW_MESSAGE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
