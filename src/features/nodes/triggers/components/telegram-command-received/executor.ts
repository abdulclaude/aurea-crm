import type { NodeExecutor } from "@/features/executions/types";
import { telegramCommandReceivedChannel } from "@/inngest/channels/telegram-command-received";

export interface TelegramCommandReceivedConfig {
  variableName?: string;
}

export const telegramCommandReceivedExecutor: NodeExecutor<TelegramCommandReceivedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(telegramCommandReceivedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(telegramCommandReceivedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(telegramCommandReceivedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "command";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
