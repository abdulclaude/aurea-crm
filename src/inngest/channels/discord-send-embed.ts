import { channel, topic } from "@inngest/realtime";

export const DISCORD_SEND_EMBED_CHANNEL_NAME = "discord-send-embed-execution";

export const discordSendEmbedChannel = channel(
  DISCORD_SEND_EMBED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
