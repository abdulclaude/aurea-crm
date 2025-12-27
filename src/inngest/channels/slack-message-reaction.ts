import { channel, topic } from "@inngest/realtime";

export const SLACK_MESSAGE_REACTION_CHANNEL_NAME = "slack-message-reaction-trigger";

export const slackMessageReactionChannel = channel(
  SLACK_MESSAGE_REACTION_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
