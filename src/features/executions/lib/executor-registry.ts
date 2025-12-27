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
import { addTagToContactExecutor } from "@/features/nodes/executions/components/add-tag-to-contact/executor";
import { removeTagFromContactExecutor } from "@/features/nodes/executions/components/remove-tag-from-contact/executor";
import { moveDealStageExecutor } from "@/features/nodes/executions/components/move-deal-stage/executor";
import { addDealNoteExecutor } from "@/features/nodes/executions/components/add-deal-note/executor";
import { googleCalendarEventCreatedExecutor } from "@/features/nodes/triggers/components/google-calendar-event-created/executor";
import { googleCalendarEventUpdatedExecutor } from "@/features/nodes/triggers/components/google-calendar-event-updated/executor";
import { googleCalendarEventDeletedExecutor } from "@/features/nodes/triggers/components/google-calendar-event-deleted/executor";
import { googleDriveFileCreatedExecutor } from "@/features/nodes/triggers/components/google-drive-file-created/executor";
import { googleDriveFileUpdatedExecutor } from "@/features/nodes/triggers/components/google-drive-file-updated/executor";
import { googleDriveFileDeletedExecutor } from "@/features/nodes/triggers/components/google-drive-file-deleted/executor";
import { googleDriveFolderCreatedExecutor } from "@/features/nodes/triggers/components/google-drive-folder-created/executor";
import { outlookNewEmailExecutor } from "@/features/nodes/triggers/components/outlook-new-email/executor";
import { outlookEmailMovedExecutor } from "@/features/nodes/triggers/components/outlook-email-moved/executor";
import { outlookEmailDeletedExecutor } from "@/features/nodes/triggers/components/outlook-email-deleted/executor";
import { onedriveFileCreatedExecutor } from "@/features/nodes/triggers/components/onedrive-file-created/executor";
import { onedriveFileUpdatedExecutor } from "@/features/nodes/triggers/components/onedrive-file-updated/executor";
import { onedriveFileDeletedExecutor } from "@/features/nodes/triggers/components/onedrive-file-deleted/executor";
import { outlookCalendarEventCreatedExecutor } from "@/features/nodes/triggers/components/outlook-calendar-event-created/executor";
import { outlookCalendarEventUpdatedExecutor } from "@/features/nodes/triggers/components/outlook-calendar-event-updated/executor";
import { outlookCalendarEventDeletedExecutor } from "@/features/nodes/triggers/components/outlook-calendar-event-deleted/executor";
import { slackNewMessageExecutor } from "@/features/nodes/triggers/components/slack-new-message/executor";
import { slackMessageReactionExecutor } from "@/features/nodes/triggers/components/slack-message-reaction/executor";
import { slackChannelJoinedExecutor } from "@/features/nodes/triggers/components/slack-channel-joined/executor";
import { discordNewMessageExecutor } from "@/features/nodes/triggers/components/discord-new-message/executor";
import { discordNewReactionExecutor } from "@/features/nodes/triggers/components/discord-new-reaction/executor";
import { discordUserJoinedExecutor } from "@/features/nodes/triggers/components/discord-user-joined/executor";
import { telegramNewMessageExecutor } from "@/features/nodes/triggers/components/telegram-new-message/executor";
import { telegramCommandReceivedExecutor } from "@/features/nodes/triggers/components/telegram-command-received/executor";
import { appointmentCreatedTriggerExecutor } from "@/features/nodes/triggers/components/appointment-created-trigger/executor";
import { appointmentCancelledTriggerExecutor } from "@/features/nodes/triggers/components/appointment-cancelled-trigger/executor";
import { stripePaymentSucceededExecutor } from "@/features/nodes/triggers/components/stripe-payment-succeeded/executor";
import { stripePaymentFailedExecutor } from "@/features/nodes/triggers/components/stripe-payment-failed/executor";
import { stripeSubscriptionCreatedExecutor } from "@/features/nodes/triggers/components/stripe-subscription-created/executor";
import { stripeSubscriptionUpdatedExecutor } from "@/features/nodes/triggers/components/stripe-subscription-updated/executor";
import { stripeSubscriptionCancelledExecutor } from "@/features/nodes/triggers/components/stripe-subscription-cancelled/executor";
import { googleCalendarFindAvailableTimesExecutor } from "@/features/nodes/executions/components/google-calendar-find-available-times/executor";
import { googleFormCreateResponseExecutor } from "@/features/nodes/executions/components/google-form-create-response/executor";
import { outlookSendEmailExecutor } from "@/features/nodes/executions/components/outlook-send-email/executor";
import { outlookReplyToEmailExecutor } from "@/features/nodes/executions/components/outlook-reply-to-email/executor";
import { outlookMoveEmailExecutor } from "@/features/nodes/executions/components/outlook-move-email/executor";
import { outlookSearchEmailsExecutor } from "@/features/nodes/executions/components/outlook-search-emails/executor";
import { onedriveUploadFileExecutor } from "@/features/nodes/executions/components/onedrive-upload-file/executor";
import { onedriveDownloadFileExecutor } from "@/features/nodes/executions/components/onedrive-download-file/executor";
import { onedriveMoveFileExecutor } from "@/features/nodes/executions/components/onedrive-move-file/executor";
import { onedriveDeleteFileExecutor } from "@/features/nodes/executions/components/onedrive-delete-file/executor";
import { outlookCalendarCreateEventExecutor } from "@/features/nodes/executions/components/outlook-calendar-create-event/executor";
import { outlookCalendarUpdateEventExecutor } from "@/features/nodes/executions/components/outlook-calendar-update-event/executor";
import { outlookCalendarDeleteEventExecutor } from "@/features/nodes/executions/components/outlook-calendar-delete-event/executor";
import { slackUpdateMessageExecutor } from "@/features/nodes/executions/components/slack-update-message/executor";
import { slackSendDmExecutor } from "@/features/nodes/executions/components/slack-send-dm/executor";
import { slackUploadFileExecutor } from "@/features/nodes/executions/components/slack-upload-file/executor";
import { discordSendMessageExecutor } from "@/features/nodes/executions/components/discord-send-message/executor";
import { discordEditMessageExecutor } from "@/features/nodes/executions/components/discord-edit-message/executor";
import { discordSendEmbedExecutor } from "@/features/nodes/executions/components/discord-send-embed/executor";
import { discordSendDmExecutor } from "@/features/nodes/executions/components/discord-send-dm/executor";
import { telegramSendMessageExecutor } from "@/features/nodes/executions/components/telegram-send-message/executor";
import { telegramSendPhotoExecutor } from "@/features/nodes/executions/components/telegram-send-photo/executor";
import { telegramSendDocumentExecutor } from "@/features/nodes/executions/components/telegram-send-document/executor";
import { scheduleAppointmentExecutor } from "@/features/nodes/executions/components/schedule-appointment/executor";
import { updateAppointmentExecutor } from "@/features/nodes/executions/components/update-appointment/executor";
import { cancelAppointmentExecutor } from "@/features/nodes/executions/components/cancel-appointment/executor";
import { stripeCreateCheckoutSessionExecutor } from "@/features/nodes/executions/components/stripe-create-checkout-session/executor";
import { stripeCreateInvoiceExecutor } from "@/features/nodes/executions/components/stripe-create-invoice/executor";
import { stripeSendInvoiceExecutor } from "@/features/nodes/executions/components/stripe-send-invoice/executor";
import { stripeRefundPaymentExecutor } from "@/features/nodes/executions/components/stripe-refund-payment/executor";
import { geminiGenerateTextExecutor } from "@/features/nodes/executions/components/gemini-generate-text/executor";
import { geminiSummariseExecutor } from "@/features/nodes/executions/components/gemini-summarise/executor";
import { geminiTransformExecutor } from "@/features/nodes/executions/components/gemini-transform/executor";
import { geminiClassifyExecutor } from "@/features/nodes/executions/components/gemini-classify/executor";
import { executeWorkflowExecutor } from "@/features/nodes/executions/components/execute-workflow/executor";
import { stubExecutor } from "./stub-executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  // Core
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,

  // Google Triggers
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.GOOGLE_CALENDAR_TRIGGER]: googleCalendarTriggerExecutor,
  [NodeType.GOOGLE_CALENDAR_EVENT_CREATED]: googleCalendarEventCreatedExecutor,
  [NodeType.GOOGLE_CALENDAR_EVENT_UPDATED]: googleCalendarEventUpdatedExecutor,
  [NodeType.GOOGLE_CALENDAR_EVENT_DELETED]: googleCalendarEventDeletedExecutor,
  [NodeType.GMAIL_TRIGGER]: gmailTriggerExecutor,
  [NodeType.GOOGLE_DRIVE_FILE_CREATED]: googleDriveFileCreatedExecutor,
  [NodeType.GOOGLE_DRIVE_FILE_UPDATED]: googleDriveFileUpdatedExecutor,
  [NodeType.GOOGLE_DRIVE_FILE_DELETED]: googleDriveFileDeletedExecutor,
  [NodeType.GOOGLE_DRIVE_FOLDER_CREATED]: googleDriveFolderCreatedExecutor,

  // Google Executions
  [NodeType.GOOGLE_CALENDAR_EXECUTION]: googleCalendarActionExecutor,
  [NodeType.GOOGLE_CALENDAR_CREATE_EVENT]: googleCalendarCreateEventExecutor as NodeExecutor,
  [NodeType.GOOGLE_CALENDAR_UPDATE_EVENT]: googleCalendarUpdateEventExecutor as NodeExecutor,
  [NodeType.GOOGLE_CALENDAR_DELETE_EVENT]: googleCalendarDeleteEventExecutor as NodeExecutor,
  [NodeType.GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES]: googleCalendarFindAvailableTimesExecutor as NodeExecutor,
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
  [NodeType.GOOGLE_FORM_CREATE_RESPONSE]: googleFormCreateResponseExecutor as NodeExecutor,

  // Microsoft Triggers
  [NodeType.OUTLOOK_TRIGGER]: outlookTriggerExecutor,
  [NodeType.OUTLOOK_NEW_EMAIL]: outlookNewEmailExecutor,
  [NodeType.OUTLOOK_EMAIL_MOVED]: outlookEmailMovedExecutor,
  [NodeType.OUTLOOK_EMAIL_DELETED]: outlookEmailDeletedExecutor,
  [NodeType.ONEDRIVE_TRIGGER]: oneDriveTriggerExecutor,
  [NodeType.ONEDRIVE_FILE_CREATED]: onedriveFileCreatedExecutor,
  [NodeType.ONEDRIVE_FILE_UPDATED]: onedriveFileUpdatedExecutor,
  [NodeType.ONEDRIVE_FILE_DELETED]: onedriveFileDeletedExecutor,
  [NodeType.OUTLOOK_CALENDAR_EVENT_CREATED]: outlookCalendarEventCreatedExecutor,
  [NodeType.OUTLOOK_CALENDAR_EVENT_UPDATED]: outlookCalendarEventUpdatedExecutor,
  [NodeType.OUTLOOK_CALENDAR_EVENT_DELETED]: outlookCalendarEventDeletedExecutor,

  // Microsoft Executions
  [NodeType.OUTLOOK_EXECUTION]: outlookExecutor,
  [NodeType.OUTLOOK_SEND_EMAIL]: outlookSendEmailExecutor as NodeExecutor,
  [NodeType.OUTLOOK_REPLY_TO_EMAIL]: outlookReplyToEmailExecutor as NodeExecutor,
  [NodeType.OUTLOOK_MOVE_EMAIL]: outlookMoveEmailExecutor as NodeExecutor,
  [NodeType.OUTLOOK_SEARCH_EMAILS]: outlookSearchEmailsExecutor as NodeExecutor,
  [NodeType.ONEDRIVE_EXECUTION]: oneDriveExecutor,
  [NodeType.ONEDRIVE_UPLOAD_FILE]: onedriveUploadFileExecutor as NodeExecutor,
  [NodeType.ONEDRIVE_DOWNLOAD_FILE]: onedriveDownloadFileExecutor as NodeExecutor,
  [NodeType.ONEDRIVE_MOVE_FILE]: onedriveMoveFileExecutor as NodeExecutor,
  [NodeType.ONEDRIVE_DELETE_FILE]: onedriveDeleteFileExecutor as NodeExecutor,
  [NodeType.OUTLOOK_CALENDAR_CREATE_EVENT]: outlookCalendarCreateEventExecutor as NodeExecutor,
  [NodeType.OUTLOOK_CALENDAR_UPDATE_EVENT]: outlookCalendarUpdateEventExecutor as NodeExecutor,
  [NodeType.OUTLOOK_CALENDAR_DELETE_EVENT]: outlookCalendarDeleteEventExecutor as NodeExecutor,

  // Communication & Social Triggers
  [NodeType.SLACK_NEW_MESSAGE]: slackNewMessageExecutor,
  [NodeType.SLACK_MESSAGE_REACTION]: slackMessageReactionExecutor,
  [NodeType.SLACK_CHANNEL_JOINED]: slackChannelJoinedExecutor,
  [NodeType.DISCORD_NEW_MESSAGE]: discordNewMessageExecutor,
  [NodeType.DISCORD_NEW_REACTION]: discordNewReactionExecutor,
  [NodeType.DISCORD_USER_JOINED]: discordUserJoinedExecutor,
  [NodeType.TELEGRAM_TRIGGER]: telegramTriggerExecutor,
  [NodeType.TELEGRAM_NEW_MESSAGE]: telegramNewMessageExecutor,
  [NodeType.TELEGRAM_COMMAND_RECEIVED]: telegramCommandReceivedExecutor,

  // Communication & Social Executions
  [NodeType.SLACK]: slackExecutor as NodeExecutor,
  [NodeType.SLACK_SEND_MESSAGE]: slackSendMessageExecutor as NodeExecutor,
  [NodeType.SLACK_UPDATE_MESSAGE]: slackUpdateMessageExecutor as NodeExecutor,
  [NodeType.SLACK_SEND_DM]: slackSendDmExecutor as NodeExecutor,
  [NodeType.SLACK_UPLOAD_FILE]: slackUploadFileExecutor as NodeExecutor,
  [NodeType.DISCORD]: discordExecutor as NodeExecutor,
  [NodeType.DISCORD_SEND_MESSAGE]: discordSendMessageExecutor as NodeExecutor,
  [NodeType.DISCORD_EDIT_MESSAGE]: discordEditMessageExecutor as NodeExecutor,
  [NodeType.DISCORD_SEND_EMBED]: discordSendEmbedExecutor as NodeExecutor,
  [NodeType.DISCORD_SEND_DM]: discordSendDmExecutor as NodeExecutor,
  [NodeType.TELEGRAM_EXECUTION]: telegramExecutionExecutor,
  [NodeType.TELEGRAM_SEND_MESSAGE]: telegramSendMessageExecutor as NodeExecutor,
  [NodeType.TELEGRAM_SEND_PHOTO]: telegramSendPhotoExecutor as NodeExecutor,
  [NodeType.TELEGRAM_SEND_DOCUMENT]: telegramSendDocumentExecutor as NodeExecutor,

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
  [NodeType.FIND_CONTACTS]: findContactsExecutor as NodeExecutor,
  [NodeType.ADD_TAG_TO_CONTACT]: addTagToContactExecutor as NodeExecutor,
  [NodeType.REMOVE_TAG_FROM_CONTACT]: removeTagFromContactExecutor as NodeExecutor,

  // CRM Deal Triggers
  [NodeType.DEAL_CREATED_TRIGGER]: dealCreatedTriggerExecutor,
  [NodeType.DEAL_UPDATED_TRIGGER]: dealUpdatedTriggerExecutor,
  [NodeType.DEAL_DELETED_TRIGGER]: dealDeletedTriggerExecutor,
  [NodeType.DEAL_STAGE_CHANGED_TRIGGER]: dealStageChangedTriggerExecutor,

  // CRM Deal Executions
  [NodeType.CREATE_DEAL]: createDealExecutor as NodeExecutor,
  [NodeType.UPDATE_DEAL]: updateDealExecutor as NodeExecutor,
  [NodeType.DELETE_DEAL]: deleteDealExecutor as NodeExecutor,
  [NodeType.MOVE_DEAL_STAGE]: moveDealStageExecutor as NodeExecutor,
  [NodeType.ADD_DEAL_NOTE]: addDealNoteExecutor as NodeExecutor,
  [NodeType.UPDATE_PIPELINE]: updatePipelineExecutor as NodeExecutor,

  // CRM Appointment Triggers
  [NodeType.APPOINTMENT_CREATED_TRIGGER]: appointmentCreatedTriggerExecutor,
  [NodeType.APPOINTMENT_CANCELLED_TRIGGER]: appointmentCancelledTriggerExecutor,

  // CRM Appointment Executions
  [NodeType.SCHEDULE_APPOINTMENT]: scheduleAppointmentExecutor as NodeExecutor,
  [NodeType.UPDATE_APPOINTMENT]: updateAppointmentExecutor as NodeExecutor,
  [NodeType.CANCEL_APPOINTMENT]: cancelAppointmentExecutor as NodeExecutor,

  // Stripe Triggers
  [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
  [NodeType.STRIPE_PAYMENT_SUCCEEDED]: stripePaymentSucceededExecutor,
  [NodeType.STRIPE_PAYMENT_FAILED]: stripePaymentFailedExecutor,
  [NodeType.STRIPE_SUBSCRIPTION_CREATED]: stripeSubscriptionCreatedExecutor,
  [NodeType.STRIPE_SUBSCRIPTION_UPDATED]: stripeSubscriptionUpdatedExecutor,
  [NodeType.STRIPE_SUBSCRIPTION_CANCELLED]: stripeSubscriptionCancelledExecutor,

  // Stripe Executions
  [NodeType.STRIPE_CREATE_CHECKOUT_SESSION]: stripeCreateCheckoutSessionExecutor as NodeExecutor,
  [NodeType.STRIPE_CREATE_INVOICE]: stripeCreateInvoiceExecutor as NodeExecutor,
  [NodeType.STRIPE_SEND_INVOICE]: stripeSendInvoiceExecutor as NodeExecutor,
  [NodeType.STRIPE_REFUND_PAYMENT]: stripeRefundPaymentExecutor as NodeExecutor,

  // Logic Nodes
  [NodeType.IF_ELSE]: ifElseExecutor,
  [NodeType.SWITCH]: switchExecutor,
  [NodeType.LOOP]: loopExecutor,
  [NodeType.WAIT]: waitExecutor as NodeExecutor,
  [NodeType.SET_VARIABLE]: setVariableExecutor,
  [NodeType.STOP_WORKFLOW]: stopWorkflowExecutor,

  // AI Nodes
  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.GEMINI_GENERATE_TEXT]: geminiGenerateTextExecutor as NodeExecutor,
  [NodeType.GEMINI_SUMMARISE]: geminiSummariseExecutor as NodeExecutor,
  [NodeType.GEMINI_TRANSFORM]: geminiTransformExecutor as NodeExecutor,
  [NodeType.GEMINI_CLASSIFY]: geminiClassifyExecutor as NodeExecutor,
  [NodeType.ANTHROPIC]: geminiExecutor,
  [NodeType.OPENAI]: geminiExecutor,

  // Bundle Workflow
  [NodeType.BUNDLE_WORKFLOW]: bundleWorkflowExecutor,
  [NodeType.EXECUTE_WORKFLOW]: executeWorkflowExecutor as NodeExecutor,
};

export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];

  if (!executor) {
    throw new Error(`No executor found for node type: ${type}`);
  }

  return executor;
};
