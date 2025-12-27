import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { telegramSendMessageChannel } from "@/inngest/channels/telegram-send-message";
import { decode } from "html-entities";

type TelegramSendMessageData = {
  variableName?: string;
  chatId: string;
  message: string;
};

export const telegramSendMessageExecutor: NodeExecutor<TelegramSendMessageData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(telegramSendMessageChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.chatId) {
      await publish(telegramSendMessageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Telegram: Send Message error: chatId is required.");
    }

    if (!data.message) {
      await publish(telegramSendMessageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Telegram: Send Message error: message is required.");
    }

    // Compile fields with Handlebars
    const chatId = data.chatId ? decode(Handlebars.compile(data.chatId)(context)) : undefined;
    const message = data.message ? decode(Handlebars.compile(data.message)(context)) : undefined;

    // TODO: Implement Telegram: Send Message logic here
    const result = await step.run("telegram-send-message", async () => {
      // Add implementation here
      throw new NonRetriableError("Telegram: Send Message: Not yet implemented");
    });

    await publish(telegramSendMessageChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(telegramSendMessageChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
