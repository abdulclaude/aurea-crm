import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { telegramSendPhotoChannel } from "@/inngest/channels/telegram-send-photo";
import { decode } from "html-entities";

type TelegramSendPhotoData = {
  variableName?: string;
  chatId: string;
  photoUrl: string;
};

export const telegramSendPhotoExecutor: NodeExecutor<TelegramSendPhotoData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(telegramSendPhotoChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.chatId) {
      await publish(telegramSendPhotoChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Telegram: Send Photo error: chatId is required.");
    }

    if (!data.photoUrl) {
      await publish(telegramSendPhotoChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Telegram: Send Photo error: photoUrl is required.");
    }

    // Compile fields with Handlebars
    const chatId = data.chatId ? decode(Handlebars.compile(data.chatId)(context)) : undefined;
    const photoUrl = data.photoUrl ? decode(Handlebars.compile(data.photoUrl)(context)) : undefined;

    // TODO: Implement Telegram: Send Photo logic here
    const result = await step.run("telegram-send-photo", async () => {
      // Add implementation here
      throw new NonRetriableError("Telegram: Send Photo: Not yet implemented");
    });

    await publish(telegramSendPhotoChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(telegramSendPhotoChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
