import type { NodeExecutor } from "../types";
import { NodeType } from "@/generated/prisma/enums";
import { manualTriggerExecutor } from "@/features/nodes/triggers/components/manual-trigger/executor";
import { googleFormTriggerExecutor } from "@/features/nodes/triggers/components/google-form-trigger/executor";
import { stripeTriggerExecutor } from "@/features/nodes/triggers/components/stripe-trigger/executor";
import { httpRequestExecutor } from "@/features/nodes/executions/components/http-request/executor";
import { geminiExecutor } from "@/features/nodes/executions/components/gemini/executor";
import { discordExecutor } from "@/features/nodes/executions/components/discord/executor";
import { slackExecutor } from "@/features/nodes/executions/components/slack/executor";
import { googleCalendarTriggerExecutor } from "@/features/nodes/triggers/components/google-calendar-trigger/executor";
import { googleCalendarActionExecutor } from "@/features/nodes/executions/components/google-calendar/executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.GOOGLE_CALENDAR_TRIGGER]: googleCalendarTriggerExecutor,
  [NodeType.GOOGLE_CALENDAR_EXECUTION]: googleCalendarActionExecutor,
  [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.ANTHROPIC]: geminiExecutor,
  [NodeType.OPENAI]: geminiExecutor,
  [NodeType.DISCORD]: discordExecutor as NodeExecutor,
  [NodeType.SLACK]: slackExecutor as NodeExecutor,
};

export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];

  if (!executor) {
    throw new Error(`No executor found for node type: ${type}`);
  }

  return executor;
};
