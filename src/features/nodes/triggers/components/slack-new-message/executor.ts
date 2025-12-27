import type { NodeExecutor } from "@/features/executions/types";
import { slackNewMessageChannel } from "@/inngest/channels/slack-new-message";

export interface SlackNewMessageConfig {
  variableName?: string;
}

export const slackNewMessageExecutor: NodeExecutor<SlackNewMessageConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(slackNewMessageChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(slackNewMessageChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(slackNewMessageChannel().status({ nodeId, status: "error" }));
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
