import type { NodeExecutor } from "@/features/executions/types";
import { slackMessageReactionChannel } from "@/inngest/channels/slack-message-reaction";

export interface SlackMessageReactionConfig {
  variableName?: string;
}

export const slackMessageReactionExecutor: NodeExecutor<SlackMessageReactionConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(slackMessageReactionChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(slackMessageReactionChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(slackMessageReactionChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "reaction";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
