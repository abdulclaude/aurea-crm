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
import { DealCreatedTriggerNode } from "@/features/nodes/triggers/components/deal-created-trigger/node";
import { DealUpdatedTriggerNode } from "@/features/nodes/triggers/components/deal-updated-trigger/node";
import { DealDeletedTriggerNode } from "@/features/nodes/triggers/components/deal-deleted-trigger/node";
import { DealStageChangedTriggerNode } from "@/features/nodes/triggers/components/deal-stage-changed-trigger/node";
import { SlackSendMessageNode } from "@/features/nodes/executions/components/slack-send-message/node";
import { FindContactsNode } from "@/features/nodes/executions/components/find-contacts/node";
import { GmailSendEmailNode } from "@/features/nodes/executions/components/gmail-send-email/node";
import { GmailReplyToEmailNode } from "@/features/nodes/executions/components/gmail-reply-to-email/node";
import { GmailSearchEmailsNode } from "@/features/nodes/executions/components/gmail-search-emails/node";
import { GmailAddLabelNode } from "@/features/nodes/executions/components/gmail-add-label/node";
import { GoogleCalendarCreateEventNode } from "@/features/nodes/executions/components/google-calendar-create-event/node";
import { GoogleCalendarUpdateEventNode } from "@/features/nodes/executions/components/google-calendar-update-event/node";
import { GoogleCalendarDeleteEventNode } from "@/features/nodes/executions/components/google-calendar-delete-event/node";
import { GoogleDriveUploadFileNode } from "@/features/nodes/executions/components/google-drive-upload-file/node";
import { GoogleDriveDownloadFileNode } from "@/features/nodes/executions/components/google-drive-download-file/node";
import { GoogleDriveMoveFileNode } from "@/features/nodes/executions/components/google-drive-move-file/node";
import { GoogleDriveDeleteFileNode } from "@/features/nodes/executions/components/google-drive-delete-file/node";
import { GoogleDriveCreateFolderNode } from "@/features/nodes/executions/components/google-drive-create-folder/node";
import { GoogleFormReadResponsesNode } from "@/features/nodes/executions/components/google-form-read-responses/node";

import { NodeType } from "@prisma/client";
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
  [NodeType.DEAL_CREATED_TRIGGER]: DealCreatedTriggerNode,
  [NodeType.DEAL_UPDATED_TRIGGER]: DealUpdatedTriggerNode,
  [NodeType.DEAL_DELETED_TRIGGER]: DealDeletedTriggerNode,
  [NodeType.DEAL_STAGE_CHANGED_TRIGGER]: DealStageChangedTriggerNode,
  [NodeType.SLACK_SEND_MESSAGE]: SlackSendMessageNode,
  [NodeType.FIND_CONTACTS]: FindContactsNode,
  [NodeType.GMAIL_SEND_EMAIL]: GmailSendEmailNode,
  [NodeType.GMAIL_REPLY_TO_EMAIL]: GmailReplyToEmailNode,
  [NodeType.GMAIL_SEARCH_EMAILS]: GmailSearchEmailsNode,
  [NodeType.GMAIL_ADD_LABEL]: GmailAddLabelNode,
  [NodeType.GOOGLE_CALENDAR_CREATE_EVENT]: GoogleCalendarCreateEventNode,
  [NodeType.GOOGLE_CALENDAR_UPDATE_EVENT]: GoogleCalendarUpdateEventNode,
  [NodeType.GOOGLE_CALENDAR_DELETE_EVENT]: GoogleCalendarDeleteEventNode,
  [NodeType.GOOGLE_DRIVE_UPLOAD_FILE]: GoogleDriveUploadFileNode,
  [NodeType.GOOGLE_DRIVE_DOWNLOAD_FILE]: GoogleDriveDownloadFileNode,
  [NodeType.GOOGLE_DRIVE_MOVE_FILE]: GoogleDriveMoveFileNode,
  [NodeType.GOOGLE_DRIVE_DELETE_FILE]: GoogleDriveDeleteFileNode,
  [NodeType.GOOGLE_DRIVE_CREATE_FOLDER]: GoogleDriveCreateFolderNode,
  [NodeType.GOOGLE_FORM_READ_RESPONSES]: GoogleFormReadResponsesNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
