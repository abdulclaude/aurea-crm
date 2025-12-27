import { channel, topic } from "@inngest/realtime";

export const DISCORD_SEND_DM_CHANNEL_NAME = "discord-send-dm-execution";

export const discordSendDmChannel = channel(
  DISCORD_SEND_DM_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
