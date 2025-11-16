import type { NodeExecutor } from "@/features/executions/types";
import { telegramTriggerChannel } from "@/inngest/channels/telegram-trigger";

type TelegramTriggerData = Record<string, unknown>;

export const telegramTriggerExecutor: NodeExecutor<
  TelegramTriggerData
> = async ({ nodeId, context, publish }) => {
  await publish(telegramTriggerChannel().status({ nodeId, status: "success" }));
  return context;
};
