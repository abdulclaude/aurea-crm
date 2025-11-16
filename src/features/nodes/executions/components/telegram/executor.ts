import { Buffer } from "node:buffer";
import Handlebars from "handlebars";

import type { NodeExecutor } from "@/features/executions/types";
import prisma from "@/lib/db";
import { NonRetriableError } from "inngest";
import { decrypt } from "@/lib/encryption";
import { telegramChannel } from "@/inngest/channels/telegram";

type TelegramExecutionData = {
  variableName?: string;
  credentialId?: string;
  chatId?: string;
  text?: string;
  parseMode?: "none" | "MarkdownV2" | "HTML";
  disableNotification?: boolean;
};

type TelegramApiResponse = {
  ok: boolean;
  result?: Record<string, unknown>;
  description?: string;
};

export const telegramExecutionExecutor: NodeExecutor<
  TelegramExecutionData
> = async ({ data, nodeId, userId, context, step, publish }) => {
  await publish(telegramChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.variableName) {
      throw new NonRetriableError(
        "Telegram node error: Variable name is required."
      );
    }

    if (!data.credentialId) {
      throw new NonRetriableError(
        "Telegram node error: Credential ID is required."
      );
    }

    if (!data.chatId) {
      throw new NonRetriableError("Telegram node error: Chat ID is required.");
    }

    if (!data.text) {
      throw new NonRetriableError(
        "Telegram node error: Message body is required."
      );
    }

    const credential = await step.run("get-telegram-credential", () =>
      prisma.credential.findUnique({
        where: {
          id: data.credentialId,
          userId,
        },
      })
    );

    if (!credential) {
      throw new NonRetriableError("Telegram node error: Credential not found.");
    }

    const compiledText = Handlebars.compile(data.text)(context).trim();
    if (!compiledText) {
      throw new NonRetriableError(
        "Telegram node error: Message body resolved to an empty string."
      );
    }

    const payload = {
      chat_id: data.chatId,
      text: compiledText,
      parse_mode:
        data.parseMode && data.parseMode !== "none"
          ? data.parseMode
          : undefined,
      disable_notification: Boolean(data.disableNotification),
    };

    const token = decrypt(credential.value);

    const result = await step.run(
      "telegram-send-message",
      async (): Promise<TelegramApiResponse> => {
        const response = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: Buffer.from(JSON.stringify(payload)),
          }
        );

        const json = (await response
          .json()
          .catch(() => ({}))) as TelegramApiResponse;

        if (!response.ok || json.ok === false) {
          throw new NonRetriableError(
            `Telegram API error: ${json.description || response.statusText}`
          );
        }

        return json;
      }
    );

    await publish(telegramChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: result,
    };
  } catch (error) {
    await publish(telegramChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
