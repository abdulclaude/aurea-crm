import { channel, topic } from "@inngest/realtime";

export const DISCORD_USER_JOINED_CHANNEL_NAME = "discord-user-joined-trigger";

export const discordUserJoinedChannel = channel(
  DISCORD_USER_JOINED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
