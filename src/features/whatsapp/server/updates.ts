"use server";

import prisma from "@/lib/db";
import { IntegrationProvider, NodeType } from "@/generated/prisma/enums";
import { sendWorkflowExecution } from "@/inngest/utils";

type WhatsAppTextMessage = {
  body?: string;
  preview_url?: boolean;
};

type WhatsAppMessage = {
  id?: string;
  type?: string;
  from?: string;
  timestamp?: string;
  text?: WhatsAppTextMessage;
  [key: string]: unknown;
};

export type WhatsAppEntryChange = {
  value?: {
    messages?: WhatsAppMessage[];
    metadata?: {
      phone_number_id?: string;
      display_phone_number?: string;
    };
    contacts?: Array<Record<string, unknown>>;
    statuses?: Array<Record<string, unknown>>;
  };
  field?: string;
  [key: string]: unknown;
};

export type WhatsAppUpdateEvent = {
  integrationId: string;
  userId: string;
  payload: WhatsAppEntryChange;
};

type WhatsAppTriggerConfig = {
  variableName?: string;
  integrationId?: string;
};

export async function processWhatsAppUpdate({
  integrationId,
  userId,
  payload,
}: WhatsAppUpdateEvent) {
  const messages = payload?.value?.messages;
  if (!messages || messages.length === 0) {
    return;
  }

  const message = messages[0];
  if (!message?.id) {
    return;
  }

  const nodes = await prisma.node.findMany({
    where: {
      type: NodeType.WHATSAPP_TRIGGER,
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

  const relevantNodes = nodes.filter((node) => {
    const config = (node.data as WhatsAppTriggerConfig) || {};
    return config.integrationId === integrationId;
  });

  if (!relevantNodes.length) {
    return;
  }

  for (const node of relevantNodes) {
    const state = await prisma.whatsAppTriggerState.findUnique({
      where: { nodeId: node.id },
    });

    if (state?.lastMessageId === message.id) {
      continue;
    }

    const variableName = normalizeVariableName(
      ((node.data as WhatsAppTriggerConfig) || {}).variableName
    );

    const payloadData = {
      messageId: message.id,
      type: message.type,
      from: message.from,
      timestamp: message.timestamp,
      text: message.text?.body,
      raw: message,
    };

    const initialData: Record<string, unknown> = {
      [variableName]: payloadData,
    };

    if (variableName !== "whatsappTrigger") {
      initialData.whatsappTrigger = payloadData;
    }

    await sendWorkflowExecution({
      workflowId: node.workflowId,
      initialData,
    });

    await prisma.whatsAppTriggerState.upsert({
      where: { nodeId: node.id },
      update: {
        lastMessageId: message.id ?? "",
        lastTriggeredAt: new Date(),
        workflowId: node.workflowId,
      },
      create: {
        nodeId: node.id,
        workflowId: node.workflowId,
        lastMessageId: message.id ?? "",
        lastTriggeredAt: new Date(),
      },
    });
  }
}

function normalizeVariableName(value?: string | null) {
  const fallback = "whatsappTrigger";
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

