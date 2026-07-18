"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { NodeType } from "@/db/enums";
import { node as nodeTable, telegramTriggerState, workflows } from "@/db/schema";
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
  organizationId,
  locationId,
  update,
}: {
  credentialId: string;
  organizationId: string;
  locationId: string | null;
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
  const nodes = await db
    .select({
      id: nodeTable.id,
      workflowId: nodeTable.workflowId,
      data: nodeTable.data,
    })
    .from(nodeTable)
    .innerJoin(workflows, eq(workflows.id, nodeTable.workflowId))
    .where(
      and(
        eq(nodeTable.type, NodeType.TELEGRAM_TRIGGER),
        eq(nodeTable.credentialId, credentialId),
        eq(workflows.organizationId, organizationId),
        locationId
          ? eq(workflows.locationId, locationId)
          : isNull(workflows.locationId),
        eq(workflows.archived, false),
        eq(workflows.isTemplate, false)
      )
    );

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

    const state = await db.query.telegramTriggerState.findFirst({
      where: eq(telegramTriggerState.nodeId, node.id),
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
      idempotencyKey: `telegram:${credentialId}:${node.id}:${incomingUpdateId}`,
    });

    await db
      .insert(telegramTriggerState)
      .values({
        id: createId(),
        nodeId: node.id,
        workflowId: node.workflowId,
        lastUpdateId: incomingUpdateId,
        lastTriggeredAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: telegramTriggerState.nodeId,
        set: {
        lastUpdateId: incomingUpdateId,
        lastTriggeredAt: new Date(),
        workflowId: node.workflowId,
        updatedAt: new Date(),
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
