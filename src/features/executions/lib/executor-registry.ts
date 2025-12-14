import type { NodeExecutor } from "../types";
import { NodeType } from "@prisma/client";
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
import { dealCreatedTriggerExecutor } from "@/features/nodes/triggers/components/deal-created-trigger/executor";
import { dealUpdatedTriggerExecutor } from "@/features/nodes/triggers/components/deal-updated-trigger/executor";
import { dealDeletedTriggerExecutor } from "@/features/nodes/triggers/components/deal-deleted-trigger/executor";
import { dealStageChangedTriggerExecutor } from "@/features/nodes/triggers/components/deal-stage-changed-trigger/executor";
import { slackSendMessageExecutor } from "@/features/nodes/executions/components/slack-send-message/executor";
import { findContactsExecutor } from "@/features/nodes/executions/components/find-contacts/executor";
import { gmailSendEmailExecutor } from "@/features/nodes/executions/components/gmail-send-email/executor";
import { gmailReplyToEmailExecutor } from "@/features/nodes/executions/components/gmail-reply-to-email/executor";
import { gmailSearchEmailsExecutor } from "@/features/nodes/executions/components/gmail-search-emails/executor";
import { gmailAddLabelExecutor } from "@/features/nodes/executions/components/gmail-add-label/executor";
import { googleCalendarCreateEventExecutor } from "@/features/nodes/executions/components/google-calendar-create-event/executor";
import { googleCalendarUpdateEventExecutor } from "@/features/nodes/executions/components/google-calendar-update-event/executor";
import { googleCalendarDeleteEventExecutor } from "@/features/nodes/executions/components/google-calendar-delete-event/executor";
import { googleDriveUploadFileExecutor } from "@/features/nodes/executions/components/google-drive-upload-file/executor";
import { googleDriveDownloadFileExecutor } from "@/features/nodes/executions/components/google-drive-download-file/executor";
import { googleDriveMoveFileExecutor } from "@/features/nodes/executions/components/google-drive-move-file/executor";
import { googleDriveDeleteFileExecutor } from "@/features/nodes/executions/components/google-drive-delete-file/executor";
import { googleDriveCreateFolderExecutor } from "@/features/nodes/executions/components/google-drive-create-folder/executor";
import { googleFormReadResponsesExecutor } from "@/features/nodes/executions/components/google-form-read-responses/executor";
import { stubExecutor } from "./stub-executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  // Core
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,

  // Google Triggers
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.GOOGLE_CALENDAR_TRIGGER]: googleCalendarTriggerExecutor,
  [NodeType.GOOGLE_CALENDAR_EVENT_CREATED]: stubExecutor,
  [NodeType.GOOGLE_CALENDAR_EVENT_UPDATED]: stubExecutor,
  [NodeType.GOOGLE_CALENDAR_EVENT_DELETED]: stubExecutor,
  [NodeType.GMAIL_TRIGGER]: gmailTriggerExecutor,
  [NodeType.GOOGLE_DRIVE_FILE_CREATED]: stubExecutor,
  [NodeType.GOOGLE_DRIVE_FILE_UPDATED]: stubExecutor,
  [NodeType.GOOGLE_DRIVE_FILE_DELETED]: stubExecutor,
  [NodeType.GOOGLE_DRIVE_FOLDER_CREATED]: stubExecutor,

  // Google Executions
  [NodeType.GOOGLE_CALENDAR_EXECUTION]: googleCalendarActionExecutor,
  [NodeType.GOOGLE_CALENDAR_CREATE_EVENT]: googleCalendarCreateEventExecutor as NodeExecutor,
  [NodeType.GOOGLE_CALENDAR_UPDATE_EVENT]: googleCalendarUpdateEventExecutor as NodeExecutor,
  [NodeType.GOOGLE_CALENDAR_DELETE_EVENT]: googleCalendarDeleteEventExecutor as NodeExecutor,
  [NodeType.GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES]: stubExecutor,
  [NodeType.GMAIL_EXECUTION]: gmailExecutor,
  [NodeType.GMAIL_SEND_EMAIL]: gmailSendEmailExecutor as NodeExecutor,
  [NodeType.GMAIL_REPLY_TO_EMAIL]: gmailReplyToEmailExecutor as NodeExecutor,
  [NodeType.GMAIL_SEARCH_EMAILS]: gmailSearchEmailsExecutor as NodeExecutor,
  [NodeType.GMAIL_ADD_LABEL]: gmailAddLabelExecutor as NodeExecutor,
  [NodeType.GOOGLE_DRIVE_UPLOAD_FILE]: googleDriveUploadFileExecutor as NodeExecutor,
  [NodeType.GOOGLE_DRIVE_DOWNLOAD_FILE]: googleDriveDownloadFileExecutor as NodeExecutor,
  [NodeType.GOOGLE_DRIVE_MOVE_FILE]: googleDriveMoveFileExecutor as NodeExecutor,
  [NodeType.GOOGLE_DRIVE_DELETE_FILE]: googleDriveDeleteFileExecutor as NodeExecutor,
  [NodeType.GOOGLE_DRIVE_CREATE_FOLDER]: googleDriveCreateFolderExecutor as NodeExecutor,
  [NodeType.GOOGLE_FORM_READ_RESPONSES]: googleFormReadResponsesExecutor as NodeExecutor,
  [NodeType.GOOGLE_FORM_CREATE_RESPONSE]: stubExecutor,

  // Microsoft Triggers
  [NodeType.OUTLOOK_TRIGGER]: outlookTriggerExecutor,
  [NodeType.OUTLOOK_NEW_EMAIL]: stubExecutor,
  [NodeType.OUTLOOK_EMAIL_MOVED]: stubExecutor,
  [NodeType.OUTLOOK_EMAIL_DELETED]: stubExecutor,
  [NodeType.ONEDRIVE_TRIGGER]: oneDriveTriggerExecutor,
  [NodeType.ONEDRIVE_FILE_CREATED]: stubExecutor,
  [NodeType.ONEDRIVE_FILE_UPDATED]: stubExecutor,
  [NodeType.ONEDRIVE_FILE_DELETED]: stubExecutor,
  [NodeType.OUTLOOK_CALENDAR_EVENT_CREATED]: stubExecutor,
  [NodeType.OUTLOOK_CALENDAR_EVENT_UPDATED]: stubExecutor,
  [NodeType.OUTLOOK_CALENDAR_EVENT_DELETED]: stubExecutor,

  // Microsoft Executions
  [NodeType.OUTLOOK_EXECUTION]: outlookExecutor,
  [NodeType.OUTLOOK_SEND_EMAIL]: stubExecutor,
  [NodeType.OUTLOOK_REPLY_TO_EMAIL]: stubExecutor,
  [NodeType.OUTLOOK_MOVE_EMAIL]: stubExecutor,
  [NodeType.OUTLOOK_SEARCH_EMAILS]: stubExecutor,
  [NodeType.ONEDRIVE_EXECUTION]: oneDriveExecutor,
  [NodeType.ONEDRIVE_UPLOAD_FILE]: stubExecutor,
  [NodeType.ONEDRIVE_DOWNLOAD_FILE]: stubExecutor,
  [NodeType.ONEDRIVE_MOVE_FILE]: stubExecutor,
  [NodeType.ONEDRIVE_DELETE_FILE]: stubExecutor,
  [NodeType.OUTLOOK_CALENDAR_CREATE_EVENT]: stubExecutor,
  [NodeType.OUTLOOK_CALENDAR_UPDATE_EVENT]: stubExecutor,
  [NodeType.OUTLOOK_CALENDAR_DELETE_EVENT]: stubExecutor,

  // Communication & Social Triggers
  [NodeType.SLACK_NEW_MESSAGE]: stubExecutor,
  [NodeType.SLACK_MESSAGE_REACTION]: stubExecutor,
  [NodeType.SLACK_CHANNEL_JOINED]: stubExecutor,
  [NodeType.DISCORD_NEW_MESSAGE]: stubExecutor,
  [NodeType.DISCORD_NEW_REACTION]: stubExecutor,
  [NodeType.DISCORD_USER_JOINED]: stubExecutor,
  [NodeType.TELEGRAM_TRIGGER]: telegramTriggerExecutor,
  [NodeType.TELEGRAM_NEW_MESSAGE]: stubExecutor,
  [NodeType.TELEGRAM_COMMAND_RECEIVED]: stubExecutor,

  // Communication & Social Executions
  [NodeType.SLACK]: slackExecutor as NodeExecutor,
  [NodeType.SLACK_SEND_MESSAGE]: slackSendMessageExecutor as NodeExecutor,
  [NodeType.SLACK_UPDATE_MESSAGE]: stubExecutor,
  [NodeType.SLACK_SEND_DM]: stubExecutor,
  [NodeType.SLACK_UPLOAD_FILE]: stubExecutor,
  [NodeType.DISCORD]: discordExecutor as NodeExecutor,
  [NodeType.DISCORD_SEND_MESSAGE]: stubExecutor,
  [NodeType.DISCORD_EDIT_MESSAGE]: stubExecutor,
  [NodeType.DISCORD_SEND_EMBED]: stubExecutor,
  [NodeType.DISCORD_SEND_DM]: stubExecutor,
  [NodeType.TELEGRAM_EXECUTION]: telegramExecutionExecutor,
  [NodeType.TELEGRAM_SEND_MESSAGE]: stubExecutor,
  [NodeType.TELEGRAM_SEND_PHOTO]: stubExecutor,
  [NodeType.TELEGRAM_SEND_DOCUMENT]: stubExecutor,

  // CRM Contact Triggers
  [NodeType.CONTACT_CREATED_TRIGGER]: contactCreatedTriggerExecutor,
  [NodeType.CONTACT_UPDATED_TRIGGER]: contactUpdatedTriggerExecutor,
  [NodeType.CONTACT_FIELD_CHANGED_TRIGGER]: contactFieldChangedTriggerExecutor,
  [NodeType.CONTACT_DELETED_TRIGGER]: contactDeletedTriggerExecutor,
  [NodeType.CONTACT_TYPE_CHANGED_TRIGGER]: contactTypeChangedTriggerExecutor,
  [NodeType.CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER]:
    contactLifecycleStageChangedTriggerExecutor,

  // CRM Contact Executions
  [NodeType.CREATE_CONTACT]: createContactExecutor as NodeExecutor,
  [NodeType.UPDATE_CONTACT]: updateContactExecutor as NodeExecutor,
  [NodeType.DELETE_CONTACT]: deleteContactExecutor as NodeExecutor,
  [NodeType.FIND_CONTACTS]: findContactsExecutor,
  [NodeType.ADD_TAG_TO_CONTACT]: stubExecutor,
  [NodeType.REMOVE_TAG_FROM_CONTACT]: stubExecutor,

  // CRM Deal Triggers
  [NodeType.DEAL_CREATED_TRIGGER]: dealCreatedTriggerExecutor,
  [NodeType.DEAL_UPDATED_TRIGGER]: dealUpdatedTriggerExecutor,
  [NodeType.DEAL_DELETED_TRIGGER]: dealDeletedTriggerExecutor,
  [NodeType.DEAL_STAGE_CHANGED_TRIGGER]: dealStageChangedTriggerExecutor,

  // CRM Deal Executions
  [NodeType.CREATE_DEAL]: createDealExecutor as NodeExecutor,
  [NodeType.UPDATE_DEAL]: updateDealExecutor as NodeExecutor,
  [NodeType.DELETE_DEAL]: deleteDealExecutor as NodeExecutor,
  [NodeType.MOVE_DEAL_STAGE]: stubExecutor,
  [NodeType.ADD_DEAL_NOTE]: stubExecutor,
  [NodeType.UPDATE_PIPELINE]: updatePipelineExecutor as NodeExecutor,

  // CRM Appointment Triggers
  [NodeType.APPOINTMENT_CREATED_TRIGGER]: stubExecutor,
  [NodeType.APPOINTMENT_CANCELLED_TRIGGER]: stubExecutor,

  // CRM Appointment Executions
  [NodeType.SCHEDULE_APPOINTMENT]: stubExecutor,
  [NodeType.UPDATE_APPOINTMENT]: stubExecutor,
  [NodeType.CANCEL_APPOINTMENT]: stubExecutor,

  // Stripe Triggers
  [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
  [NodeType.STRIPE_PAYMENT_SUCCEEDED]: stubExecutor,
  [NodeType.STRIPE_PAYMENT_FAILED]: stubExecutor,
  [NodeType.STRIPE_SUBSCRIPTION_CREATED]: stubExecutor,
  [NodeType.STRIPE_SUBSCRIPTION_UPDATED]: stubExecutor,
  [NodeType.STRIPE_SUBSCRIPTION_CANCELLED]: stubExecutor,

  // Stripe Executions
  [NodeType.STRIPE_CREATE_CHECKOUT_SESSION]: stubExecutor,
  [NodeType.STRIPE_CREATE_INVOICE]: stubExecutor,
  [NodeType.STRIPE_SEND_INVOICE]: stubExecutor,
  [NodeType.STRIPE_REFUND_PAYMENT]: stubExecutor,

  // Logic Nodes
  [NodeType.IF_ELSE]: ifElseExecutor,
  [NodeType.SWITCH]: switchExecutor,
  [NodeType.LOOP]: loopExecutor,
  [NodeType.WAIT]: waitExecutor as NodeExecutor,
  [NodeType.SET_VARIABLE]: setVariableExecutor,
  [NodeType.STOP_WORKFLOW]: stopWorkflowExecutor,

  // AI Nodes
  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.GEMINI_GENERATE_TEXT]: stubExecutor,
  [NodeType.GEMINI_SUMMARISE]: stubExecutor,
  [NodeType.GEMINI_TRANSFORM]: stubExecutor,
  [NodeType.GEMINI_CLASSIFY]: stubExecutor,
  [NodeType.ANTHROPIC]: geminiExecutor,
  [NodeType.OPENAI]: geminiExecutor,

  // Bundle Workflow
  [NodeType.BUNDLE_WORKFLOW]: bundleWorkflowExecutor,
  [NodeType.EXECUTE_WORKFLOW]: stubExecutor,
};

export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];

  if (!executor) {
    throw new Error(`No executor found for node type: ${type}`);
  }

  return executor;
};
