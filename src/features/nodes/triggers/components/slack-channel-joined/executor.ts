import type { NodeExecutor } from "@/features/executions/types";
import { slackChannelJoinedChannel } from "@/inngest/channels/slack-channel-joined";

export interface SlackChannelJoinedConfig {
  variableName?: string;
}

export const slackChannelJoinedExecutor: NodeExecutor<SlackChannelJoinedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(slackChannelJoinedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(slackChannelJoinedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(slackChannelJoinedChannel().status({ nodeId, status: "error" }));
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
