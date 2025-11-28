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
import { gmailTriggerExecutor } from "@/features/nodes/triggers/components/gmail-trigger/executor";
import { gmailExecutor } from "@/features/nodes/executions/components/gmail/executor";
import { telegramTriggerExecutor } from "@/features/nodes/triggers/components/telegram-trigger/executor";
import { telegramExecutionExecutor } from "@/features/nodes/executions/components/telegram/executor";
import { waitExecutor } from "@/features/nodes/executions/components/wait/executor";
import { createContactExecutor } from "@/features/nodes/executions/components/create-contact/executor";
import { updateContactExecutor } from "@/features/nodes/executions/components/update-contact/executor";
import { deleteContactExecutor } from "@/features/nodes/executions/components/delete-contact/executor";
import { createDealExecutor } from "@/features/nodes/executions/components/create-deal/executor";
import { updateDealExecutor } from "@/features/nodes/executions/components/update-deal/executor";
import { deleteDealExecutor } from "@/features/nodes/executions/components/delete-deal/executor";
import { updatePipelineExecutor } from "@/features/nodes/executions/components/update-pipeline/executor";
import { contactCreatedTriggerExecutor } from "@/features/nodes/triggers/components/contact-created-trigger/executor";
import { contactUpdatedTriggerExecutor } from "@/features/nodes/triggers/components/contact-updated-trigger/executor";
import { contactFieldChangedTriggerExecutor } from "@/features/nodes/triggers/components/contact-field-changed-trigger/executor";
import { contactDeletedTriggerExecutor } from "@/features/nodes/triggers/components/contact-deleted-trigger/executor";
import { contactTypeChangedTriggerExecutor } from "@/features/nodes/triggers/components/contact-type-changed-trigger/executor";
import { contactLifecycleStageChangedTriggerExecutor } from "@/features/nodes/triggers/components/contact-lifecycle-stage-changed-trigger/executor";
import { ifElseExecutor } from "@/features/nodes/executions/components/if-else/executor";
import { setVariableExecutor } from "@/features/nodes/executions/components/set-variable/executor";
import { stopWorkflowExecutor } from "@/features/nodes/executions/components/stop-workflow/executor";
import { switchExecutor } from "@/features/nodes/executions/components/switch/executor";
import { loopExecutor } from "@/features/nodes/executions/components/loop/executor";
import { bundleWorkflowExecutor } from "@/features/nodes/executions/components/bundle-workflow/executor";
import { outlookExecutor } from "@/features/nodes/executions/components/outlook/executor";
import { oneDriveExecutor } from "@/features/nodes/executions/components/onedrive/executor";
import { outlookTriggerExecutor } from "@/features/nodes/triggers/components/outlook-trigger/executor";
import { oneDriveTriggerExecutor } from "@/features/nodes/triggers/components/onedrive-trigger/executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.GOOGLE_CALENDAR_TRIGGER]: googleCalendarTriggerExecutor,
  [NodeType.GOOGLE_CALENDAR_EXECUTION]: googleCalendarActionExecutor,
  [NodeType.GMAIL_TRIGGER]: gmailTriggerExecutor,
  [NodeType.GMAIL_EXECUTION]: gmailExecutor,
  [NodeType.TELEGRAM_TRIGGER]: telegramTriggerExecutor,
  [NodeType.TELEGRAM_EXECUTION]: telegramExecutionExecutor,
  [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.ANTHROPIC]: geminiExecutor,
  [NodeType.OPENAI]: geminiExecutor,
  [NodeType.DISCORD]: discordExecutor as NodeExecutor,
  [NodeType.SLACK]: slackExecutor as NodeExecutor,
  [NodeType.WAIT]: waitExecutor as NodeExecutor,
  [NodeType.CREATE_CONTACT]: createContactExecutor as NodeExecutor,
  [NodeType.UPDATE_CONTACT]: updateContactExecutor as NodeExecutor,
  [NodeType.DELETE_CONTACT]: deleteContactExecutor as NodeExecutor,
  [NodeType.CREATE_DEAL]: createDealExecutor as NodeExecutor,
  [NodeType.UPDATE_DEAL]: updateDealExecutor as NodeExecutor,
  [NodeType.DELETE_DEAL]: deleteDealExecutor as NodeExecutor,
  [NodeType.UPDATE_PIPELINE]: updatePipelineExecutor as NodeExecutor,
  [NodeType.CONTACT_CREATED_TRIGGER]: contactCreatedTriggerExecutor,
  [NodeType.CONTACT_UPDATED_TRIGGER]: contactUpdatedTriggerExecutor,
  [NodeType.CONTACT_FIELD_CHANGED_TRIGGER]: contactFieldChangedTriggerExecutor,
  [NodeType.CONTACT_DELETED_TRIGGER]: contactDeletedTriggerExecutor,
  [NodeType.CONTACT_TYPE_CHANGED_TRIGGER]: contactTypeChangedTriggerExecutor,
  [NodeType.CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER]:
    contactLifecycleStageChangedTriggerExecutor,
  [NodeType.IF_ELSE]: ifElseExecutor,
  [NodeType.SET_VARIABLE]: setVariableExecutor,
  [NodeType.STOP_WORKFLOW]: stopWorkflowExecutor,
  [NodeType.SWITCH]: switchExecutor,
  [NodeType.LOOP]: loopExecutor,
  [NodeType.BUNDLE_WORKFLOW]: bundleWorkflowExecutor,
  [NodeType.OUTLOOK_TRIGGER]: outlookTriggerExecutor,
  [NodeType.OUTLOOK_EXECUTION]: outlookExecutor,
  [NodeType.ONEDRIVE_TRIGGER]: oneDriveTriggerExecutor,
  [NodeType.ONEDRIVE_EXECUTION]: oneDriveExecutor,
};

export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];

  if (!executor) {
    throw new Error(`No executor found for node type: ${type}`);
  }

  return executor;
};
