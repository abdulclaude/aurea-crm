import { channel, topic } from "@inngest/realtime";

export const SLACK_CHANNEL_JOINED_CHANNEL_NAME = "slack-channel-joined-trigger";

export const slackChannelJoinedChannel = channel(
  SLACK_CHANNEL_JOINED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
