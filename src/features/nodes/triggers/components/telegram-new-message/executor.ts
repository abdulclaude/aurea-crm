import type { NodeExecutor } from "@/features/executions/types";
import { telegramNewMessageChannel } from "@/inngest/channels/telegram-new-message";

export interface TelegramNewMessageConfig {
  variableName?: string;
}

export const telegramNewMessageExecutor: NodeExecutor<TelegramNewMessageConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(telegramNewMessageChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(telegramNewMessageChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(telegramNewMessageChannel().status({ nodeId, status: "error" }));
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
