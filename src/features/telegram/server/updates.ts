"use server";

import prisma from "@/lib/db";
import { NodeType } from "@prisma/client";
import { sendWorkflowExecution } from "@/inngest/utils";

type TelegramChat = {
  id?: number;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramUser = {
  id?: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TelegramMessage = {
  message_id?: number;
  message_thread_id?: number;
  from?: TelegramUser;
  chat?: TelegramChat;
  date?: number;
  text?: string;
  caption?: string;
  entities?: unknown;
  [key: string]: unknown;
};

export type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_message?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  [key: string]: unknown;
};

type TelegramTriggerConfig = {
  variableName?: string;
  chatId?: string;
  credentialId?: string;
};

export async function processTelegramUpdate({
  credentialId,
  userId,
  update,
}: {
  credentialId: string;
  userId: string;
  update: TelegramUpdate;
}) {
  const primaryMessage =
    update.message ??
    update.channel_post ??
    update.edited_message ??
    update.edited_channel_post;

  if (!primaryMessage?.chat?.id) {
    return;
  }

  const chatId = String(primaryMessage.chat.id);
  const nodes = await prisma.node.findMany({
    where: {
      type: NodeType.TELEGRAM_TRIGGER,
      credentialId,
      workflow: {
        userId,
        archived: false,
        isTemplate: false,
      },
    },
    select: {
      id: true,
      workflowId: true,
      data: true,
    },
  });

  if (!nodes.length) {
    return;
  }

  for (const node of nodes) {
    const config = (node.data as TelegramTriggerConfig) || {};
    if (config.credentialId && config.credentialId !== credentialId) {
      continue;
    }
    if (config.chatId && config.chatId !== chatId) {
      continue;
    }

    const incomingUpdateId = String(
      update.update_id ?? primaryMessage.message_id ?? Date.now()
    );

    const state = await prisma.telegramTriggerState.findUnique({
      where: { nodeId: node.id },
    });

    if (
      state?.lastUpdateId &&
      Number(incomingUpdateId) <= Number(state.lastUpdateId)
    ) {
      continue;
    }

    const variableName = normalizeVariableName(config.variableName);
    const payload = {
      updateId: incomingUpdateId,
      chatId,
      chat: primaryMessage.chat,
      message: primaryMessage,
      text: primaryMessage.text ?? primaryMessage.caption,
      raw: update,
    };

    const initialData: Record<string, unknown> = {
      [variableName]: payload,
    };

    if (variableName !== "telegramTrigger") {
      initialData.telegramTrigger = payload;
    }

    await sendWorkflowExecution({
      workflowId: node.workflowId,
      initialData,
    });

    await prisma.telegramTriggerState.upsert({
      where: { nodeId: node.id },
      update: {
        lastUpdateId: incomingUpdateId,
        lastTriggeredAt: new Date(),
        workflowId: node.workflowId,
      },
      create: {
        nodeId: node.id,
        workflowId: node.workflowId,
        lastUpdateId: incomingUpdateId,
        lastTriggeredAt: new Date(),
      },
    });
  }
}

function normalizeVariableName(value?: string | null) {
  const fallback = "telegramTrigger";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
