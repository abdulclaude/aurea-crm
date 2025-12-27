import type { NodeExecutor } from "@/features/executions/types";
import { discordUserJoinedChannel } from "@/inngest/channels/discord-user-joined";

export interface DiscordUserJoinedConfig {
  variableName?: string;
}

export const discordUserJoinedExecutor: NodeExecutor<DiscordUserJoinedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(discordUserJoinedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(discordUserJoinedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(discordUserJoinedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "joinEvent";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
