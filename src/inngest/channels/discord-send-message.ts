import { channel, topic } from "@inngest/realtime";

export const DISCORD_SEND_MESSAGE_CHANNEL_NAME = "discord-send-message-execution";

export const discordSendMessageChannel = channel(
  DISCORD_SEND_MESSAGE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
