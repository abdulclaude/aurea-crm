import { channel, topic } from "@inngest/realtime";

export const SLACK_SEND_MESSAGE_CHANNEL_NAME = "slack-send-message";

export const slackSendMessageChannel = channel(SLACK_SEND_MESSAGE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
