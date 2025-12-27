import { channel, topic } from "@inngest/realtime";

export const DISCORD_NEW_MESSAGE_CHANNEL_NAME = "discord-new-message-trigger";

export const discordNewMessageChannel = channel(
  DISCORD_NEW_MESSAGE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
