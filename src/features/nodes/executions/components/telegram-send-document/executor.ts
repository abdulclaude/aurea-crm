import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { telegramSendDocumentChannel } from "@/inngest/channels/telegram-send-document";
import { decode } from "html-entities";

type TelegramSendDocumentData = {
  variableName?: string;
  chatId: string;
  documentUrl: string;
};

export const telegramSendDocumentExecutor: NodeExecutor<TelegramSendDocumentData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(telegramSendDocumentChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.chatId) {
      await publish(telegramSendDocumentChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Telegram: Send Document error: chatId is required.");
    }

    if (!data.documentUrl) {
      await publish(telegramSendDocumentChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Telegram: Send Document error: documentUrl is required.");
    }

    // Compile fields with Handlebars
    const chatId = data.chatId ? decode(Handlebars.compile(data.chatId)(context)) : undefined;
    const documentUrl = data.documentUrl ? decode(Handlebars.compile(data.documentUrl)(context)) : undefined;

    // TODO: Implement Telegram: Send Document logic here
    const result = await step.run("telegram-send-document", async () => {
      // Add implementation here
      throw new NonRetriableError("Telegram: Send Document: Not yet implemented");
    });

    await publish(telegramSendDocumentChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(telegramSendDocumentChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
