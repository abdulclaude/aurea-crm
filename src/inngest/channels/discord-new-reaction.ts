import { channel, topic } from "@inngest/realtime";

export const DISCORD_NEW_REACTION_CHANNEL_NAME = "discord-new-reaction-trigger";

export const discordNewReactionChannel = channel(
  DISCORD_NEW_REACTION_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
