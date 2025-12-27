import { channel, topic } from "@inngest/realtime";

export const DISCORD_EDIT_MESSAGE_CHANNEL_NAME = "discord-edit-message-execution";

export const discordEditMessageChannel = channel(
  DISCORD_EDIT_MESSAGE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
