import type { NodeExecutor } from "@/features/executions/types";
import { discordNewMessageChannel } from "@/inngest/channels/discord-new-message";

export interface DiscordNewMessageConfig {
  variableName?: string;
}

export const discordNewMessageExecutor: NodeExecutor<DiscordNewMessageConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(discordNewMessageChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(discordNewMessageChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(discordNewMessageChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "newMessage";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
