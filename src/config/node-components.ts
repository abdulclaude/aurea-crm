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
import { GoogleFormNode } from "@/features/nodes/triggers/components/google-form-trigger/node";
import { GoogleCalendarNode } from "@/features/nodes/triggers/components/google-calendar-trigger/node";
import { ManualTriggerNode } from "@/features/nodes/triggers/components/manual-trigger/node";
import { StripeTriggerNode } from "@/features/nodes/triggers/components/stripe-trigger/node";
import { WaitNode } from "@/features/nodes/executions/components/wait/node";
import { CreateContactNode } from "@/features/nodes/executions/components/create-contact/node";
import { UpdateContactNode } from "@/features/nodes/executions/components/update-contact/node";
import { DeleteContactNode } from "@/features/nodes/executions/components/delete-contact/node";
import { CreateDealNode } from "@/features/nodes/executions/components/create-deal/node";
import { UpdateDealNode } from "@/features/nodes/executions/components/update-deal/node";
import { DeleteDealNode } from "@/features/nodes/executions/components/delete-deal/node";
import { UpdatePipelineNode } from "@/features/nodes/executions/components/update-pipeline/node";
import { ContactCreatedTriggerNode } from "@/features/nodes/triggers/components/contact-created-trigger/node";
import { ContactUpdatedTriggerNode } from "@/features/nodes/triggers/components/contact-updated-trigger/node";
import { ContactFieldChangedTriggerNode } from "@/features/nodes/triggers/components/contact-field-changed-trigger/node";
import { ContactDeletedTriggerNode } from "@/features/nodes/triggers/components/contact-deleted-trigger/node";
import { ContactTypeChangedTriggerNode } from "@/features/nodes/triggers/components/contact-type-changed-trigger/node";
import { ContactLifecycleStageChangedTriggerNode } from "@/features/nodes/triggers/components/contact-lifecycle-stage-changed-trigger/node";
import { IfElseNode } from "@/features/nodes/executions/components/if-else/node";
import { SetVariableNode } from "@/features/nodes/executions/components/set-variable/node";
import { StopWorkflowNode } from "@/features/nodes/executions/components/stop-workflow/node";
import { SwitchNode } from "@/features/nodes/executions/components/switch/node";
import { LoopNode } from "@/features/nodes/executions/components/loop/node";
import { BundleWorkflowNode } from "@/features/nodes/executions/components/bundle-workflow/node";
import { OutlookTriggerNode } from "@/features/nodes/triggers/components/outlook-trigger/node";
import { OutlookNode } from "@/features/nodes/executions/components/outlook/node";
import { OneDriveTriggerNode } from "@/features/nodes/triggers/components/onedrive-trigger/node";
import { OneDriveNode } from "@/features/nodes/executions/components/onedrive/node";

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
  [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.SLACK]: SlackNode,
  [NodeType.WAIT]: WaitNode,
  [NodeType.CREATE_CONTACT]: CreateContactNode,
  [NodeType.UPDATE_CONTACT]: UpdateContactNode,
  [NodeType.DELETE_CONTACT]: DeleteContactNode,
  [NodeType.CREATE_DEAL]: CreateDealNode,
  [NodeType.UPDATE_DEAL]: UpdateDealNode,
  [NodeType.DELETE_DEAL]: DeleteDealNode,
  [NodeType.UPDATE_PIPELINE]: UpdatePipelineNode,
  [NodeType.CONTACT_CREATED_TRIGGER]: ContactCreatedTriggerNode,
  [NodeType.CONTACT_UPDATED_TRIGGER]: ContactUpdatedTriggerNode,
  [NodeType.CONTACT_FIELD_CHANGED_TRIGGER]: ContactFieldChangedTriggerNode,
  [NodeType.CONTACT_DELETED_TRIGGER]: ContactDeletedTriggerNode,
  [NodeType.CONTACT_TYPE_CHANGED_TRIGGER]: ContactTypeChangedTriggerNode,
  [NodeType.CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER]:
    ContactLifecycleStageChangedTriggerNode,
  [NodeType.IF_ELSE]: IfElseNode,
  [NodeType.SET_VARIABLE]: SetVariableNode,
  [NodeType.STOP_WORKFLOW]: StopWorkflowNode,
  [NodeType.SWITCH]: SwitchNode,
  [NodeType.LOOP]: LoopNode,
  [NodeType.BUNDLE_WORKFLOW]: BundleWorkflowNode,
  [NodeType.ANTHROPIC]: GeminiNode,
  [NodeType.OPENAI]: GeminiNode,
  [NodeType.OUTLOOK_TRIGGER]: OutlookTriggerNode,
  [NodeType.OUTLOOK_EXECUTION]: OutlookNode,
  [NodeType.ONEDRIVE_TRIGGER]: OneDriveTriggerNode,
  [NodeType.ONEDRIVE_EXECUTION]: OneDriveNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
