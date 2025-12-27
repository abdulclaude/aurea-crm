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
import { AddTagToContactNode } from "@/features/nodes/executions/components/add-tag-to-contact/node";
import { RemoveTagFromContactNode } from "@/features/nodes/executions/components/remove-tag-from-contact/node";
import { MoveDealStageNode } from "@/features/nodes/executions/components/move-deal-stage/node";
import { AddDealNoteNode } from "@/features/nodes/executions/components/add-deal-note/node";
import { GoogleCalendarEventCreatedNode } from "@/features/nodes/triggers/components/google-calendar-event-created/node";
import { GoogleCalendarEventUpdatedNode } from "@/features/nodes/triggers/components/google-calendar-event-updated/node";
import { GoogleCalendarEventDeletedNode } from "@/features/nodes/triggers/components/google-calendar-event-deleted/node";
import { GoogleDriveFileCreatedNode } from "@/features/nodes/triggers/components/google-drive-file-created/node";
import { GoogleDriveFileUpdatedNode } from "@/features/nodes/triggers/components/google-drive-file-updated/node";
import { GoogleDriveFileDeletedNode } from "@/features/nodes/triggers/components/google-drive-file-deleted/node";
import { GoogleDriveFolderCreatedNode } from "@/features/nodes/triggers/components/google-drive-folder-created/node";
import { OutlookNewEmailNode } from "@/features/nodes/triggers/components/outlook-new-email/node";
import { OutlookEmailMovedNode } from "@/features/nodes/triggers/components/outlook-email-moved/node";
import { OutlookEmailDeletedNode } from "@/features/nodes/triggers/components/outlook-email-deleted/node";
import { OnedriveFileCreatedNode } from "@/features/nodes/triggers/components/onedrive-file-created/node";
import { OnedriveFileUpdatedNode } from "@/features/nodes/triggers/components/onedrive-file-updated/node";
import { OnedriveFileDeletedNode } from "@/features/nodes/triggers/components/onedrive-file-deleted/node";
import { OutlookCalendarEventCreatedNode } from "@/features/nodes/triggers/components/outlook-calendar-event-created/node";
import { OutlookCalendarEventUpdatedNode } from "@/features/nodes/triggers/components/outlook-calendar-event-updated/node";
import { OutlookCalendarEventDeletedNode } from "@/features/nodes/triggers/components/outlook-calendar-event-deleted/node";
import { SlackNewMessageNode } from "@/features/nodes/triggers/components/slack-new-message/node";
import { SlackMessageReactionNode } from "@/features/nodes/triggers/components/slack-message-reaction/node";
import { SlackChannelJoinedNode } from "@/features/nodes/triggers/components/slack-channel-joined/node";
import { DiscordNewMessageNode } from "@/features/nodes/triggers/components/discord-new-message/node";
import { DiscordNewReactionNode } from "@/features/nodes/triggers/components/discord-new-reaction/node";
import { DiscordUserJoinedNode } from "@/features/nodes/triggers/components/discord-user-joined/node";
import { TelegramNewMessageNode } from "@/features/nodes/triggers/components/telegram-new-message/node";
import { TelegramCommandReceivedNode } from "@/features/nodes/triggers/components/telegram-command-received/node";
import { AppointmentCreatedTriggerNode } from "@/features/nodes/triggers/components/appointment-created-trigger/node";
import { AppointmentCancelledTriggerNode } from "@/features/nodes/triggers/components/appointment-cancelled-trigger/node";
import { StripePaymentSucceededNode } from "@/features/nodes/triggers/components/stripe-payment-succeeded/node";
import { StripePaymentFailedNode } from "@/features/nodes/triggers/components/stripe-payment-failed/node";
import { StripeSubscriptionCreatedNode } from "@/features/nodes/triggers/components/stripe-subscription-created/node";
import { StripeSubscriptionUpdatedNode } from "@/features/nodes/triggers/components/stripe-subscription-updated/node";
import { StripeSubscriptionCancelledNode } from "@/features/nodes/triggers/components/stripe-subscription-cancelled/node";
import { GoogleCalendarFindAvailableTimesNode } from "@/features/nodes/executions/components/google-calendar-find-available-times/node";
import { GoogleFormCreateResponseNode } from "@/features/nodes/executions/components/google-form-create-response/node";
import { OutlookSendEmailNode } from "@/features/nodes/executions/components/outlook-send-email/node";
import { OutlookReplyToEmailNode } from "@/features/nodes/executions/components/outlook-reply-to-email/node";
import { OutlookMoveEmailNode } from "@/features/nodes/executions/components/outlook-move-email/node";
import { OutlookSearchEmailsNode } from "@/features/nodes/executions/components/outlook-search-emails/node";
import { OnedriveUploadFileNode } from "@/features/nodes/executions/components/onedrive-upload-file/node";
import { OnedriveDownloadFileNode } from "@/features/nodes/executions/components/onedrive-download-file/node";
import { OnedriveMoveFileNode } from "@/features/nodes/executions/components/onedrive-move-file/node";
import { OnedriveDeleteFileNode } from "@/features/nodes/executions/components/onedrive-delete-file/node";
import { OutlookCalendarCreateEventNode } from "@/features/nodes/executions/components/outlook-calendar-create-event/node";
import { OutlookCalendarUpdateEventNode } from "@/features/nodes/executions/components/outlook-calendar-update-event/node";
import { OutlookCalendarDeleteEventNode } from "@/features/nodes/executions/components/outlook-calendar-delete-event/node";
import { SlackUpdateMessageNode } from "@/features/nodes/executions/components/slack-update-message/node";
import { SlackSendDmNode } from "@/features/nodes/executions/components/slack-send-dm/node";
import { SlackUploadFileNode } from "@/features/nodes/executions/components/slack-upload-file/node";
import { DiscordSendMessageNode } from "@/features/nodes/executions/components/discord-send-message/node";
import { DiscordEditMessageNode } from "@/features/nodes/executions/components/discord-edit-message/node";
import { DiscordSendEmbedNode } from "@/features/nodes/executions/components/discord-send-embed/node";
import { DiscordSendDmNode } from "@/features/nodes/executions/components/discord-send-dm/node";
import { TelegramSendMessageNode } from "@/features/nodes/executions/components/telegram-send-message/node";
import { TelegramSendPhotoNode } from "@/features/nodes/executions/components/telegram-send-photo/node";
import { TelegramSendDocumentNode } from "@/features/nodes/executions/components/telegram-send-document/node";
import { ScheduleAppointmentNode } from "@/features/nodes/executions/components/schedule-appointment/node";
import { UpdateAppointmentNode } from "@/features/nodes/executions/components/update-appointment/node";
import { CancelAppointmentNode } from "@/features/nodes/executions/components/cancel-appointment/node";
import { StripeCreateCheckoutSessionNode } from "@/features/nodes/executions/components/stripe-create-checkout-session/node";
import { StripeCreateInvoiceNode } from "@/features/nodes/executions/components/stripe-create-invoice/node";
import { StripeSendInvoiceNode } from "@/features/nodes/executions/components/stripe-send-invoice/node";
import { StripeRefundPaymentNode } from "@/features/nodes/executions/components/stripe-refund-payment/node";
import { GeminiGenerateTextNode } from "@/features/nodes/executions/components/gemini-generate-text/node";
import { GeminiSummariseNode } from "@/features/nodes/executions/components/gemini-summarise/node";
import { GeminiTransformNode } from "@/features/nodes/executions/components/gemini-transform/node";
import { GeminiClassifyNode } from "@/features/nodes/executions/components/gemini-classify/node";
import { ExecuteWorkflowNode } from "@/features/nodes/executions/components/execute-workflow/node";

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
  [NodeType.ADD_TAG_TO_CONTACT]: AddTagToContactNode,
  [NodeType.REMOVE_TAG_FROM_CONTACT]: RemoveTagFromContactNode,
  [NodeType.MOVE_DEAL_STAGE]: MoveDealStageNode,
  [NodeType.ADD_DEAL_NOTE]: AddDealNoteNode,
  [NodeType.GOOGLE_CALENDAR_EVENT_CREATED]: GoogleCalendarEventCreatedNode,
  [NodeType.GOOGLE_CALENDAR_EVENT_UPDATED]: GoogleCalendarEventUpdatedNode,
  [NodeType.GOOGLE_CALENDAR_EVENT_DELETED]: GoogleCalendarEventDeletedNode,
  [NodeType.GOOGLE_DRIVE_FILE_CREATED]: GoogleDriveFileCreatedNode,
  [NodeType.GOOGLE_DRIVE_FILE_UPDATED]: GoogleDriveFileUpdatedNode,
  [NodeType.GOOGLE_DRIVE_FILE_DELETED]: GoogleDriveFileDeletedNode,
  [NodeType.GOOGLE_DRIVE_FOLDER_CREATED]: GoogleDriveFolderCreatedNode,
  [NodeType.OUTLOOK_NEW_EMAIL]: OutlookNewEmailNode,
  [NodeType.OUTLOOK_EMAIL_MOVED]: OutlookEmailMovedNode,
  [NodeType.OUTLOOK_EMAIL_DELETED]: OutlookEmailDeletedNode,
  [NodeType.ONEDRIVE_FILE_CREATED]: OnedriveFileCreatedNode,
  [NodeType.ONEDRIVE_FILE_UPDATED]: OnedriveFileUpdatedNode,
  [NodeType.ONEDRIVE_FILE_DELETED]: OnedriveFileDeletedNode,
  [NodeType.OUTLOOK_CALENDAR_EVENT_CREATED]: OutlookCalendarEventCreatedNode,
  [NodeType.OUTLOOK_CALENDAR_EVENT_UPDATED]: OutlookCalendarEventUpdatedNode,
  [NodeType.OUTLOOK_CALENDAR_EVENT_DELETED]: OutlookCalendarEventDeletedNode,
  [NodeType.SLACK_NEW_MESSAGE]: SlackNewMessageNode,
  [NodeType.SLACK_MESSAGE_REACTION]: SlackMessageReactionNode,
  [NodeType.SLACK_CHANNEL_JOINED]: SlackChannelJoinedNode,
  [NodeType.DISCORD_NEW_MESSAGE]: DiscordNewMessageNode,
  [NodeType.DISCORD_NEW_REACTION]: DiscordNewReactionNode,
  [NodeType.DISCORD_USER_JOINED]: DiscordUserJoinedNode,
  [NodeType.TELEGRAM_NEW_MESSAGE]: TelegramNewMessageNode,
  [NodeType.TELEGRAM_COMMAND_RECEIVED]: TelegramCommandReceivedNode,
  [NodeType.APPOINTMENT_CREATED_TRIGGER]: AppointmentCreatedTriggerNode,
  [NodeType.APPOINTMENT_CANCELLED_TRIGGER]: AppointmentCancelledTriggerNode,
  [NodeType.STRIPE_PAYMENT_SUCCEEDED]: StripePaymentSucceededNode,
  [NodeType.STRIPE_PAYMENT_FAILED]: StripePaymentFailedNode,
  [NodeType.STRIPE_SUBSCRIPTION_CREATED]: StripeSubscriptionCreatedNode,
  [NodeType.STRIPE_SUBSCRIPTION_UPDATED]: StripeSubscriptionUpdatedNode,
  [NodeType.STRIPE_SUBSCRIPTION_CANCELLED]: StripeSubscriptionCancelledNode,
  [NodeType.GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES]:
    GoogleCalendarFindAvailableTimesNode,
  [NodeType.GOOGLE_FORM_CREATE_RESPONSE]: GoogleFormCreateResponseNode,
  [NodeType.OUTLOOK_SEND_EMAIL]: OutlookSendEmailNode,
  [NodeType.OUTLOOK_REPLY_TO_EMAIL]: OutlookReplyToEmailNode,
  [NodeType.OUTLOOK_MOVE_EMAIL]: OutlookMoveEmailNode,
  [NodeType.OUTLOOK_SEARCH_EMAILS]: OutlookSearchEmailsNode,
  [NodeType.ONEDRIVE_UPLOAD_FILE]: OnedriveUploadFileNode,
  [NodeType.ONEDRIVE_DOWNLOAD_FILE]: OnedriveDownloadFileNode,
  [NodeType.ONEDRIVE_MOVE_FILE]: OnedriveMoveFileNode,
  [NodeType.ONEDRIVE_DELETE_FILE]: OnedriveDeleteFileNode,
  [NodeType.OUTLOOK_CALENDAR_CREATE_EVENT]: OutlookCalendarCreateEventNode,
  [NodeType.OUTLOOK_CALENDAR_UPDATE_EVENT]: OutlookCalendarUpdateEventNode,
  [NodeType.OUTLOOK_CALENDAR_DELETE_EVENT]: OutlookCalendarDeleteEventNode,
  [NodeType.SLACK_UPDATE_MESSAGE]: SlackUpdateMessageNode,
  [NodeType.SLACK_SEND_DM]: SlackSendDmNode,
  [NodeType.SLACK_UPLOAD_FILE]: SlackUploadFileNode,
  [NodeType.DISCORD_SEND_MESSAGE]: DiscordSendMessageNode,
  [NodeType.DISCORD_EDIT_MESSAGE]: DiscordEditMessageNode,
  [NodeType.DISCORD_SEND_EMBED]: DiscordSendEmbedNode,
  [NodeType.DISCORD_SEND_DM]: DiscordSendDmNode,
  [NodeType.TELEGRAM_SEND_MESSAGE]: TelegramSendMessageNode,
  [NodeType.TELEGRAM_SEND_PHOTO]: TelegramSendPhotoNode,
  [NodeType.TELEGRAM_SEND_DOCUMENT]: TelegramSendDocumentNode,
  [NodeType.SCHEDULE_APPOINTMENT]: ScheduleAppointmentNode,
  [NodeType.UPDATE_APPOINTMENT]: UpdateAppointmentNode,
  [NodeType.CANCEL_APPOINTMENT]: CancelAppointmentNode,
  [NodeType.STRIPE_CREATE_CHECKOUT_SESSION]: StripeCreateCheckoutSessionNode,
  [NodeType.STRIPE_CREATE_INVOICE]: StripeCreateInvoiceNode,
  [NodeType.STRIPE_SEND_INVOICE]: StripeSendInvoiceNode,
  [NodeType.STRIPE_REFUND_PAYMENT]: StripeRefundPaymentNode,
  [NodeType.GEMINI_GENERATE_TEXT]: GeminiGenerateTextNode,
  [NodeType.GEMINI_SUMMARISE]: GeminiSummariseNode,
  [NodeType.GEMINI_TRANSFORM]: GeminiTransformNode,
  [NodeType.GEMINI_CLASSIFY]: GeminiClassifyNode,
  [NodeType.EXECUTE_WORKFLOW]: ExecuteWorkflowNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
