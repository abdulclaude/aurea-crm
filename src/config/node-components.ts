import { InitialNode } from "@/components/nodes/initial-node";
import { DiscordNode } from "@/features/nodes/executions/components/discord/node";
import { GeminiNode } from "@/features/nodes/executions/components/gemini/node";
import { HttpRequestNode } from "@/features/nodes/executions/components/http-request/node";
import { SlackNode } from "@/features/nodes/executions/components/slack/node";
import { GoogleCalendarActionNode } from "@/features/nodes/executions/components/google-calendar/node";
import { GmailTriggerNode } from "@/features/nodes/triggers/components/gmail-trigger/node";
import { GmailNode } from "@/features/nodes/executions/components/gmail/node";
import { TelegramTriggerNode } from "@/features/nodes/triggers/components/telegram-trigger/node";
import { TelegramExecutionNode } from "@/features/nodes/executions/components/telegram/node";
import { WhatsAppTriggerNode } from "@/features/nodes/triggers/components/whatsapp-trigger/node";
import { WhatsAppExecutionNode } from "@/features/nodes/executions/components/whatsapp/node";
import { GoogleFormNode } from "@/features/nodes/triggers/components/google-form-trigger/node";
import { GoogleCalendarNode } from "@/features/nodes/triggers/components/google-calendar-trigger/node";
import { ManualTriggerNode } from "@/features/nodes/triggers/components/manual-trigger/node";
import { StripeTriggerNode } from "@/features/nodes/triggers/components/stripe-trigger/node";

import { NodeType } from "@/generated/prisma/enums";
import { NodeTypes } from "@xyflow/react";

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormNode,
  [NodeType.GOOGLE_CALENDAR_TRIGGER]: GoogleCalendarNode,
  [NodeType.GOOGLE_CALENDAR_EXECUTION]: GoogleCalendarActionNode,
  [NodeType.GMAIL_TRIGGER]: GmailTriggerNode,
  [NodeType.GMAIL_EXECUTION]: GmailNode,
  [NodeType.TELEGRAM_TRIGGER]: TelegramTriggerNode,
  [NodeType.TELEGRAM_EXECUTION]: TelegramExecutionNode,
  [NodeType.WHATSAPP_TRIGGER]: WhatsAppTriggerNode,
  [NodeType.WHATSAPP_EXECUTION]: WhatsAppExecutionNode,
  [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.SLACK]: SlackNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
