#!/usr/bin/env tsx
/**
 * Node Registration Script
 * Updates node-components.ts and executor-registry.ts with all generated nodes
 */

import * as fs from 'fs';
import * as path from 'path';

const ALL_NEW_NODES = [
  // Already manually created
  { type: 'ADD_TAG_TO_CONTACT', component: 'AddTagToContactNode', executor: 'addTagToContactExecutor', path: 'executions' },
  { type: 'REMOVE_TAG_FROM_CONTACT', component: 'RemoveTagFromContactNode', executor: 'removeTagFromContactExecutor', path: 'executions' },
  { type: 'MOVE_DEAL_STAGE', component: 'MoveDealStageNode', executor: 'moveDealStageExecutor', path: 'executions' },
  { type: 'ADD_DEAL_NOTE', component: 'AddDealNoteNode', executor: 'addDealNoteExecutor', path: 'executions' },
  
  // Generated nodes - Triggers
  { type: 'GOOGLE_CALENDAR_EVENT_CREATED', component: 'GoogleCalendarEventCreatedNode', executor: 'googleCalendarEventCreatedExecutor', path: 'triggers' },
  { type: 'GOOGLE_CALENDAR_EVENT_UPDATED', component: 'GoogleCalendarEventUpdatedNode', executor: 'googleCalendarEventUpdatedExecutor', path: 'triggers' },
  { type: 'GOOGLE_CALENDAR_EVENT_DELETED', component: 'GoogleCalendarEventDeletedNode', executor: 'googleCalendarEventDeletedExecutor', path: 'triggers' },
  { type: 'GOOGLE_DRIVE_FILE_CREATED', component: 'GoogleDriveFileCreatedNode', executor: 'googleDriveFileCreatedExecutor', path: 'triggers' },
  { type: 'GOOGLE_DRIVE_FILE_UPDATED', component: 'GoogleDriveFileUpdatedNode', executor: 'googleDriveFileUpdatedExecutor', path: 'triggers' },
  { type: 'GOOGLE_DRIVE_FILE_DELETED', component: 'GoogleDriveFileDeletedNode', executor: 'googleDriveFileDeletedExecutor', path: 'triggers' },
  { type: 'GOOGLE_DRIVE_FOLDER_CREATED', component: 'GoogleDriveFolderCreatedNode', executor: 'googleDriveFolderCreatedExecutor', path: 'triggers' },
  { type: 'OUTLOOK_NEW_EMAIL', component: 'OutlookNewEmailNode', executor: 'outlookNewEmailExecutor', path: 'triggers' },
  { type: 'OUTLOOK_EMAIL_MOVED', component: 'OutlookEmailMovedNode', executor: 'outlookEmailMovedExecutor', path: 'triggers' },
  { type: 'OUTLOOK_EMAIL_DELETED', component: 'OutlookEmailDeletedNode', executor: 'outlookEmailDeletedExecutor', path: 'triggers' },
  { type: 'ONEDRIVE_FILE_CREATED', component: 'OnedriveFileCreatedNode', executor: 'onedriveFileCreatedExecutor', path: 'triggers' },
  { type: 'ONEDRIVE_FILE_UPDATED', component: 'OnedriveFileUpdatedNode', executor: 'onedriveFileUpdatedExecutor', path: 'triggers' },
  { type: 'ONEDRIVE_FILE_DELETED', component: 'OnedriveFileDeletedNode', executor: 'onedriveFileDeletedExecutor', path: 'triggers' },
  { type: 'OUTLOOK_CALENDAR_EVENT_CREATED', component: 'OutlookCalendarEventCreatedNode', executor: 'outlookCalendarEventCreatedExecutor', path: 'triggers' },
  { type: 'OUTLOOK_CALENDAR_EVENT_UPDATED', component: 'OutlookCalendarEventUpdatedNode', executor: 'outlookCalendarEventUpdatedExecutor', path: 'triggers' },
  { type: 'OUTLOOK_CALENDAR_EVENT_DELETED', component: 'OutlookCalendarEventDeletedNode', executor: 'outlookCalendarEventDeletedExecutor', path: 'triggers' },
  { type: 'SLACK_NEW_MESSAGE', component: 'SlackNewMessageNode', executor: 'slackNewMessageExecutor', path: 'triggers' },
  { type: 'SLACK_MESSAGE_REACTION', component: 'SlackMessageReactionNode', executor: 'slackMessageReactionExecutor', path: 'triggers' },
  { type: 'SLACK_CHANNEL_JOINED', component: 'SlackChannelJoinedNode', executor: 'slackChannelJoinedExecutor', path: 'triggers' },
  { type: 'DISCORD_NEW_MESSAGE', component: 'DiscordNewMessageNode', executor: 'discordNewMessageExecutor', path: 'triggers' },
  { type: 'DISCORD_NEW_REACTION', component: 'DiscordNewReactionNode', executor: 'discordNewReactionExecutor', path: 'triggers' },
  { type: 'DISCORD_USER_JOINED', component: 'DiscordUserJoinedNode', executor: 'discordUserJoinedExecutor', path: 'triggers' },
  { type: 'TELEGRAM_NEW_MESSAGE', component: 'TelegramNewMessageNode', executor: 'telegramNewMessageExecutor', path: 'triggers' },
  { type: 'TELEGRAM_COMMAND_RECEIVED', component: 'TelegramCommandReceivedNode', executor: 'telegramCommandReceivedExecutor', path: 'triggers' },
  { type: 'APPOINTMENT_CREATED_TRIGGER', component: 'AppointmentCreatedTriggerNode', executor: 'appointmentCreatedTriggerExecutor', path: 'triggers' },
  { type: 'APPOINTMENT_CANCELLED_TRIGGER', component: 'AppointmentCancelledTriggerNode', executor: 'appointmentCancelledTriggerExecutor', path: 'triggers' },
  { type: 'STRIPE_PAYMENT_SUCCEEDED', component: 'StripePaymentSucceededNode', executor: 'stripePaymentSucceededExecutor', path: 'triggers' },
  { type: 'STRIPE_PAYMENT_FAILED', component: 'StripePaymentFailedNode', executor: 'stripePaymentFailedExecutor', path: 'triggers' },
  { type: 'STRIPE_SUBSCRIPTION_CREATED', component: 'StripeSubscriptionCreatedNode', executor: 'stripeSubscriptionCreatedExecutor', path: 'triggers' },
  { type: 'STRIPE_SUBSCRIPTION_UPDATED', component: 'StripeSubscriptionUpdatedNode', executor: 'stripeSubscriptionUpdatedExecutor', path: 'triggers' },
  { type: 'STRIPE_SUBSCRIPTION_CANCELLED', component: 'StripeSubscriptionCancelledNode', executor: 'stripeSubscriptionCancelledExecutor', path: 'triggers' },
  
  // Generated nodes - Executions
  { type: 'GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES', component: 'GoogleCalendarFindAvailableTimesNode', executor: 'googleCalendarFindAvailableTimesExecutor', path: 'executions' },
  { type: 'GOOGLE_FORM_CREATE_RESPONSE', component: 'GoogleFormCreateResponseNode', executor: 'googleFormCreateResponseExecutor', path: 'executions' },
  { type: 'OUTLOOK_SEND_EMAIL', component: 'OutlookSendEmailNode', executor: 'outlookSendEmailExecutor', path: 'executions' },
  { type: 'OUTLOOK_REPLY_TO_EMAIL', component: 'OutlookReplyToEmailNode', executor: 'outlookReplyToEmailExecutor', path: 'executions' },
  { type: 'OUTLOOK_MOVE_EMAIL', component: 'OutlookMoveEmailNode', executor: 'outlookMoveEmailExecutor', path: 'executions' },
  { type: 'OUTLOOK_SEARCH_EMAILS', component: 'OutlookSearchEmailsNode', executor: 'outlookSearchEmailsExecutor', path: 'executions' },
  { type: 'ONEDRIVE_UPLOAD_FILE', component: 'OnedriveUploadFileNode', executor: 'onedriveUploadFileExecutor', path: 'executions' },
  { type: 'ONEDRIVE_DOWNLOAD_FILE', component: 'OnedriveDownloadFileNode', executor: 'onedriveDownloadFileExecutor', path: 'executions' },
  { type: 'ONEDRIVE_MOVE_FILE', component: 'OnedriveMoveFileNode', executor: 'onedriveMoveFileExecutor', path: 'executions' },
  { type: 'ONEDRIVE_DELETE_FILE', component: 'OnedriveDeleteFileNode', executor: 'onedriveDeleteFileExecutor', path: 'executions' },
  { type: 'OUTLOOK_CALENDAR_CREATE_EVENT', component: 'OutlookCalendarCreateEventNode', executor: 'outlookCalendarCreateEventExecutor', path: 'executions' },
  { type: 'OUTLOOK_CALENDAR_UPDATE_EVENT', component: 'OutlookCalendarUpdateEventNode', executor: 'outlookCalendarUpdateEventExecutor', path: 'executions' },
  { type: 'OUTLOOK_CALENDAR_DELETE_EVENT', component: 'OutlookCalendarDeleteEventNode', executor: 'outlookCalendarDeleteEventExecutor', path: 'executions' },
  { type: 'SLACK_UPDATE_MESSAGE', component: 'SlackUpdateMessageNode', executor: 'slackUpdateMessageExecutor', path: 'executions' },
  { type: 'SLACK_SEND_DM', component: 'SlackSendDmNode', executor: 'slackSendDmExecutor', path: 'executions' },
  { type: 'SLACK_UPLOAD_FILE', component: 'SlackUploadFileNode', executor: 'slackUploadFileExecutor', path: 'executions' },
  { type: 'DISCORD_SEND_MESSAGE', component: 'DiscordSendMessageNode', executor: 'discordSendMessageExecutor', path: 'executions' },
  { type: 'DISCORD_EDIT_MESSAGE', component: 'DiscordEditMessageNode', executor: 'discordEditMessageExecutor', path: 'executions' },
  { type: 'DISCORD_SEND_EMBED', component: 'DiscordSendEmbedNode', executor: 'discordSendEmbedExecutor', path: 'executions' },
  { type: 'DISCORD_SEND_DM', component: 'DiscordSendDmNode', executor: 'discordSendDmExecutor', path: 'executions' },
  { type: 'TELEGRAM_SEND_MESSAGE', component: 'TelegramSendMessageNode', executor: 'telegramSendMessageExecutor', path: 'executions' },
  { type: 'TELEGRAM_SEND_PHOTO', component: 'TelegramSendPhotoNode', executor: 'telegramSendPhotoExecutor', path: 'executions' },
  { type: 'TELEGRAM_SEND_DOCUMENT', component: 'TelegramSendDocumentNode', executor: 'telegramSendDocumentExecutor', path: 'executions' },
  { type: 'SCHEDULE_APPOINTMENT', component: 'ScheduleAppointmentNode', executor: 'scheduleAppointmentExecutor', path: 'executions' },
  { type: 'UPDATE_APPOINTMENT', component: 'UpdateAppointmentNode', executor: 'updateAppointmentExecutor', path: 'executions' },
  { type: 'CANCEL_APPOINTMENT', component: 'CancelAppointmentNode', executor: 'cancelAppointmentExecutor', path: 'executions' },
  { type: 'STRIPE_CREATE_CHECKOUT_SESSION', component: 'StripeCreateCheckoutSessionNode', executor: 'stripeCreateCheckoutSessionExecutor', path: 'executions' },
  { type: 'STRIPE_CREATE_INVOICE', component: 'StripeCreateInvoiceNode', executor: 'stripeCreateInvoiceExecutor', path: 'executions' },
  { type: 'STRIPE_SEND_INVOICE', component: 'StripeSendInvoiceNode', executor: 'stripeSendInvoiceExecutor', path: 'executions' },
  { type: 'STRIPE_REFUND_PAYMENT', component: 'StripeRefundPaymentNode', executor: 'stripeRefundPaymentExecutor', path: 'executions' },
  { type: 'GEMINI_GENERATE_TEXT', component: 'GeminiGenerateTextNode', executor: 'geminiGenerateTextExecutor', path: 'executions' },
  { type: 'GEMINI_SUMMARISE', component: 'GeminiSummariseNode', executor: 'geminiSummariseExecutor', path: 'executions' },
  { type: 'GEMINI_TRANSFORM', component: 'GeminiTransformNode', executor: 'geminiTransformExecutor', path: 'executions' },
  { type: 'GEMINI_CLASSIFY', component: 'GeminiClassifyNode', executor: 'geminiClassifyExecutor', path: 'executions' },
  { type: 'EXECUTE_WORKFLOW', component: 'ExecuteWorkflowNode', executor: 'executeWorkflowExecutor', path: 'executions' },
];

function toKebabCase(str: string): string {
  return str.toLowerCase().replace(/_/g, '-');
}

// Update node-components.ts
function updateNodeComponents() {
  const filePath = path.join(__dirname, 'src', 'config', 'node-components.ts');
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find the last import line
  const lastImportIndex = content.lastIndexOf('import');
  const nextLineAfterImports = content.indexOf('\n', lastImportIndex);
  
  // Generate new imports
  const newImports = ALL_NEW_NODES.map(node => {
    const kebabName = toKebabCase(node.type);
    return `import { ${node.component} } from "@/features/nodes/${node.path}/components/${kebabName}/node";`;
  }).join('\n');
  
  // Insert imports after existing ones
  content = content.slice(0, nextLineAfterImports + 1) + newImports + '\n' + content.slice(nextLineAfterImports + 1);
  
  // Find the end of nodeComponents object (before export)
  const exportIndex = content.indexOf('export const nodeComponents');
  const lastBraceIndex = content.lastIndexOf('}', exportIndex);
  
  // Generate new entries
  const newEntries = ALL_NEW_NODES.map(node => {
    return `  [NodeType.${node.type}]: ${node.component},`;
  }).join('\n');
  
  // Insert entries before closing brace
  content = content.slice(0, lastBraceIndex) + newEntries + '\n' + content.slice(lastBraceIndex);
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Updated node-components.ts');
}

// Update executor-registry.ts
function updateExecutorRegistry() {
  const filePath = path.join(__dirname, 'src', 'features', 'executions', 'lib', 'executor-registry.ts');
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find the last import line before stubExecutor
  const stubImportIndex = content.indexOf('import { stubExecutor }');
  
  // Generate new imports
  const newImports = ALL_NEW_NODES.map(node => {
    const kebabName = toKebabCase(node.type);
    return `import { ${node.executor} } from "@/features/nodes/${node.path}/components/${kebabName}/executor";`;
  }).join('\n');
  
  // Insert imports before stubExecutor import
  content = content.slice(0, stubImportIndex) + newImports + '\n' + content.slice(stubImportIndex);
  
  // Replace stubExecutor with actual executors
  ALL_NEW_NODES.forEach(node => {
    const pattern = new RegExp(`\\[NodeType\\.${node.type}\\]: stubExecutor,?`, 'g');
    content = content.replace(pattern, `[NodeType.${node.type}]: ${node.executor},`);
  });
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Updated executor-registry.ts');
}

// Run updates
console.log('🚀 Registering all nodes...\n');
updateNodeComponents();
updateExecutorRegistry();
console.log('\n✨ Registration complete!');

