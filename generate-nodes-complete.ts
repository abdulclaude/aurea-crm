#!/usr/bin/env tsx
/**
 * Complete Node Generation Script
 * Generates all missing workflow nodes with tailored implementations
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NodeSpec {
  type: string;
  nodeType: 'trigger' | 'execution';
  name: string;
  icon: string;
  description: string;
  fields: { name: string; required: boolean; default?: string }[];
  authProvider?: string;
  category: string;
}

// ============================================================================
// CONDENSED NODE SPECIFICATIONS (All 67 remaining nodes)
// ============================================================================

const ALL_NODES: NodeSpec[] = [
  // Google Calendar Triggers (3)
  { type: 'GOOGLE_CALENDAR_EVENT_CREATED', nodeType: 'trigger', name: 'Google Calendar: Event Created', icon: '/logos/googlecalendar.svg', description: 'Triggers when a calendar event is created', fields: [{name: 'variableName', required: true, default: 'newEvent'}], authProvider: 'google', category: 'google-triggers' },
  { type: 'GOOGLE_CALENDAR_EVENT_UPDATED', nodeType: 'trigger', name: 'Google Calendar: Event Updated', icon: '/logos/googlecalendar.svg', description: 'Triggers when a calendar event is updated', fields: [{name: 'variableName', required: true, default: 'updatedEvent'}], authProvider: 'google', category: 'google-triggers' },
  { type: 'GOOGLE_CALENDAR_EVENT_DELETED', nodeType: 'trigger', name: 'Google Calendar: Event Deleted', icon: '/logos/googlecalendar.svg', description: 'Triggers when a calendar event is deleted', fields: [{name: 'variableName', required: true, default: 'deletedEvent'}], authProvider: 'google', category: 'google-triggers' },
  
  // Google Drive Triggers (4)
  { type: 'GOOGLE_DRIVE_FILE_CREATED', nodeType: 'trigger', name: 'Google Drive: File Created', icon: '/logos/googledrive.svg', description: 'Triggers when a file is created in Google Drive', fields: [{name: 'variableName', required: true, default: 'newFile'}], authProvider: 'google', category: 'google-triggers' },
  { type: 'GOOGLE_DRIVE_FILE_UPDATED', nodeType: 'trigger', name: 'Google Drive: File Updated', icon: '/logos/googledrive.svg', description: 'Triggers when a file is updated in Google Drive', fields: [{name: 'variableName', required: true, default: 'updatedFile'}], authProvider: 'google', category: 'google-triggers' },
  { type: 'GOOGLE_DRIVE_FILE_DELETED', nodeType: 'trigger', name: 'Google Drive: File Deleted', icon: '/logos/googledrive.svg', description: 'Triggers when a file is deleted from Google Drive', fields: [{name: 'variableName', required: true, default: 'deletedFile'}], authProvider: 'google', category: 'google-triggers' },
  { type: 'GOOGLE_DRIVE_FOLDER_CREATED', nodeType: 'trigger', name: 'Google Drive: Folder Created', icon: '/logos/googledrive.svg', description: 'Triggers when a folder is created in Google Drive', fields: [{name: 'variableName', required: true, default: 'newFolder'}], authProvider: 'google', category: 'google-triggers' },
  
  // Google Executions (2)
  { type: 'GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES', nodeType: 'execution', name: 'Google Calendar: Find Available Times', icon: '/logos/googlecalendar.svg', description: 'Find available time slots in Google Calendar', fields: [{name: 'variableName', required: true, default: 'availableTimes'}, {name: 'calendarId', required: true}, {name: 'timeMin', required: true}, {name: 'timeMax', required: true}], authProvider: 'google', category: 'google-executions' },
  { type: 'GOOGLE_FORM_CREATE_RESPONSE', nodeType: 'execution', name: 'Google Forms: Create Response', icon: '/logos/googleform.svg', description: 'Submit a response to a Google Form', fields: [{name: 'variableName', required: true, default: 'formResponse'}, {name: 'formId', required: true}, {name: 'responses', required: true}], authProvider: 'google', category: 'google-executions' },
  
  // Outlook Email Triggers (3)
  { type: 'OUTLOOK_NEW_EMAIL', nodeType: 'trigger', name: 'Outlook: New Email', icon: '/logos/outlook.svg', description: 'Triggers when a new email arrives', fields: [{name: 'variableName', required: true, default: 'newEmail'}], authProvider: 'microsoft', category: 'microsoft-triggers' },
  { type: 'OUTLOOK_EMAIL_MOVED', nodeType: 'trigger', name: 'Outlook: Email Moved', icon: '/logos/outlook.svg', description: 'Triggers when an email is moved', fields: [{name: 'variableName', required: true, default: 'movedEmail'}], authProvider: 'microsoft', category: 'microsoft-triggers' },
  { type: 'OUTLOOK_EMAIL_DELETED', nodeType: 'trigger', name: 'Outlook: Email Deleted', icon: '/logos/outlook.svg', description: 'Triggers when an email is deleted', fields: [{name: 'variableName', required: true, default: 'deletedEmail'}], authProvider: 'microsoft', category: 'microsoft-triggers' },
  
  // Outlook Email Executions (4)
  { type: 'OUTLOOK_SEND_EMAIL', nodeType: 'execution', name: 'Outlook: Send Email', icon: '/logos/outlook.svg', description: 'Send an email via Outlook', fields: [{name: 'variableName', required: true, default: 'sentEmail'}, {name: 'to', required: true}, {name: 'subject', required: true}, {name: 'body', required: true}], authProvider: 'microsoft', category: 'microsoft-executions' },
  { type: 'OUTLOOK_REPLY_TO_EMAIL', nodeType: 'execution', name: 'Outlook: Reply to Email', icon: '/logos/outlook.svg', description: 'Reply to an email', fields: [{name: 'variableName', required: true, default: 'reply'}, {name: 'messageId', required: true}, {name: 'body', required: true}], authProvider: 'microsoft', category: 'microsoft-executions' },
  { type: 'OUTLOOK_MOVE_EMAIL', nodeType: 'execution', name: 'Outlook: Move Email', icon: '/logos/outlook.svg', description: 'Move an email to a folder', fields: [{name: 'variableName', required: true, default: 'movedEmail'}, {name: 'messageId', required: true}, {name: 'destinationFolderId', required: true}], authProvider: 'microsoft', category: 'microsoft-executions' },
  { type: 'OUTLOOK_SEARCH_EMAILS', nodeType: 'execution', name: 'Outlook: Search Emails', icon: '/logos/outlook.svg', description: 'Search emails in Outlook', fields: [{name: 'variableName', required: true, default: 'searchResults'}, {name: 'query', required: true}], authProvider: 'microsoft', category: 'microsoft-executions' },
  
  // OneDrive Triggers (3)
  { type: 'ONEDRIVE_FILE_CREATED', nodeType: 'trigger', name: 'OneDrive: File Created', icon: '/logos/onedrive.svg', description: 'Triggers when a file is created', fields: [{name: 'variableName', required: true, default: 'newFile'}], authProvider: 'microsoft', category: 'microsoft-triggers' },
  { type: 'ONEDRIVE_FILE_UPDATED', nodeType: 'trigger', name: 'OneDrive: File Updated', icon: '/logos/onedrive.svg', description: 'Triggers when a file is updated', fields: [{name: 'variableName', required: true, default: 'updatedFile'}], authProvider: 'microsoft', category: 'microsoft-triggers' },
  { type: 'ONEDRIVE_FILE_DELETED', nodeType: 'trigger', name: 'OneDrive: File Deleted', icon: '/logos/onedrive.svg', description: 'Triggers when a file is deleted', fields: [{name: 'variableName', required: true, default: 'deletedFile'}], authProvider: 'microsoft', category: 'microsoft-triggers' },
  
  // OneDrive Executions (4)
  { type: 'ONEDRIVE_UPLOAD_FILE', nodeType: 'execution', name: 'OneDrive: Upload File', icon: '/logos/onedrive.svg', description: 'Upload a file to OneDrive', fields: [{name: 'variableName', required: true, default: 'uploadedFile'}, {name: 'fileName', required: true}, {name: 'fileContent', required: true}], authProvider: 'microsoft', category: 'microsoft-executions' },
  { type: 'ONEDRIVE_DOWNLOAD_FILE', nodeType: 'execution', name: 'OneDrive: Download File', icon: '/logos/onedrive.svg', description: 'Download a file from OneDrive', fields: [{name: 'variableName', required: true, default: 'downloadedFile'}, {name: 'fileId', required: true}], authProvider: 'microsoft', category: 'microsoft-executions' },
  { type: 'ONEDRIVE_MOVE_FILE', nodeType: 'execution', name: 'OneDrive: Move File', icon: '/logos/onedrive.svg', description: 'Move a file in OneDrive', fields: [{name: 'variableName', required: true, default: 'movedFile'}, {name: 'fileId', required: true}, {name: 'destinationFolderId', required: true}], authProvider: 'microsoft', category: 'microsoft-executions' },
  { type: 'ONEDRIVE_DELETE_FILE', nodeType: 'execution', name: 'OneDrive: Delete File', icon: '/logos/onedrive.svg', description: 'Delete a file from OneDrive', fields: [{name: 'variableName', required: true, default: 'result'}, {name: 'fileId', required: true}], authProvider: 'microsoft', category: 'microsoft-executions' },
  
  // Outlook Calendar Triggers (3)
  { type: 'OUTLOOK_CALENDAR_EVENT_CREATED', nodeType: 'trigger', name: 'Outlook Calendar: Event Created', icon: '/logos/outlook.svg', description: 'Triggers when a calendar event is created', fields: [{name: 'variableName', required: true, default: 'newEvent'}], authProvider: 'microsoft', category: 'microsoft-triggers' },
  { type: 'OUTLOOK_CALENDAR_EVENT_UPDATED', nodeType: 'trigger', name: 'Outlook Calendar: Event Updated', icon: '/logos/outlook.svg', description: 'Triggers when a calendar event is updated', fields: [{name: 'variableName', required: true, default: 'updatedEvent'}], authProvider: 'microsoft', category: 'microsoft-triggers' },
  { type: 'OUTLOOK_CALENDAR_EVENT_DELETED', nodeType: 'trigger', name: 'Outlook Calendar: Event Deleted', icon: '/logos/outlook.svg', description: 'Triggers when a calendar event is deleted', fields: [{name: 'variableName', required: true, default: 'deletedEvent'}], authProvider: 'microsoft', category: 'microsoft-triggers' },
  
  // Outlook Calendar Executions (3)
  { type: 'OUTLOOK_CALENDAR_CREATE_EVENT', nodeType: 'execution', name: 'Outlook Calendar: Create Event', icon: '/logos/outlook.svg', description: 'Create a calendar event', fields: [{name: 'variableName', required: true, default: 'createdEvent'}, {name: 'subject', required: true}, {name: 'start', required: true}, {name: 'end', required: true}], authProvider: 'microsoft', category: 'microsoft-executions' },
  { type: 'OUTLOOK_CALENDAR_UPDATE_EVENT', nodeType: 'execution', name: 'Outlook Calendar: Update Event', icon: '/logos/outlook.svg', description: 'Update a calendar event', fields: [{name: 'variableName', required: true, default: 'updatedEvent'}, {name: 'eventId', required: true}], authProvider: 'microsoft', category: 'microsoft-executions' },
  { type: 'OUTLOOK_CALENDAR_DELETE_EVENT', nodeType: 'execution', name: 'Outlook Calendar: Delete Event', icon: '/logos/outlook.svg', description: 'Delete a calendar event', fields: [{name: 'variableName', required: true, default: 'result'}, {name: 'eventId', required: true}], authProvider: 'microsoft', category: 'microsoft-executions' },
  
  // Slack Triggers (3)
  { type: 'SLACK_NEW_MESSAGE', nodeType: 'trigger', name: 'Slack: New Message', icon: '/logos/slack.svg', description: 'Triggers when a new Slack message is posted', fields: [{name: 'variableName', required: true, default: 'newMessage'}, {name: 'channelId', required: true}], authProvider: 'slack', category: 'social-triggers' },
  { type: 'SLACK_MESSAGE_REACTION', nodeType: 'trigger', name: 'Slack: Message Reaction', icon: '/logos/slack.svg', description: 'Triggers when a reaction is added to a message', fields: [{name: 'variableName', required: true, default: 'reaction'}], authProvider: 'slack', category: 'social-triggers' },
  { type: 'SLACK_CHANNEL_JOINED', nodeType: 'trigger', name: 'Slack: Channel Joined', icon: '/logos/slack.svg', description: 'Triggers when a user joins a channel', fields: [{name: 'variableName', required: true, default: 'joinEvent'}], authProvider: 'slack', category: 'social-triggers' },
  
  // Slack Executions (3)
  { type: 'SLACK_UPDATE_MESSAGE', nodeType: 'execution', name: 'Slack: Update Message', icon: '/logos/slack.svg', description: 'Update an existing Slack message', fields: [{name: 'variableName', required: true, default: 'updatedMessage'}, {name: 'channel', required: true}, {name: 'timestamp', required: true}, {name: 'message', required: true}], authProvider: 'slack', category: 'social-executions' },
  { type: 'SLACK_SEND_DM', nodeType: 'execution', name: 'Slack: Send DM', icon: '/logos/slack.svg', description: 'Send a direct message in Slack', fields: [{name: 'variableName', required: true, default: 'sentDM'}, {name: 'userId', required: true}, {name: 'message', required: true}], authProvider: 'slack', category: 'social-executions' },
  { type: 'SLACK_UPLOAD_FILE', nodeType: 'execution', name: 'Slack: Upload File', icon: '/logos/slack.svg', description: 'Upload a file to Slack', fields: [{name: 'variableName', required: true, default: 'uploadedFile'}, {name: 'channel', required: true}, {name: 'file', required: true}, {name: 'filename', required: true}], authProvider: 'slack', category: 'social-executions' },
  
  // Discord Triggers (3)
  { type: 'DISCORD_NEW_MESSAGE', nodeType: 'trigger', name: 'Discord: New Message', icon: '/logos/discord.svg', description: 'Triggers when a new Discord message is posted', fields: [{name: 'variableName', required: true, default: 'newMessage'}, {name: 'channelId', required: true}], authProvider: 'discord', category: 'social-triggers' },
  { type: 'DISCORD_NEW_REACTION', nodeType: 'trigger', name: 'Discord: New Reaction', icon: '/logos/discord.svg', description: 'Triggers when a reaction is added', fields: [{name: 'variableName', required: true, default: 'reaction'}], authProvider: 'discord', category: 'social-triggers' },
  { type: 'DISCORD_USER_JOINED', nodeType: 'trigger', name: 'Discord: User Joined', icon: '/logos/discord.svg', description: 'Triggers when a user joins the server', fields: [{name: 'variableName', required: true, default: 'joinEvent'}], authProvider: 'discord', category: 'social-triggers' },
  
  // Discord Executions (4)
  { type: 'DISCORD_SEND_MESSAGE', nodeType: 'execution', name: 'Discord: Send Message', icon: '/logos/discord.svg', description: 'Send a message to Discord', fields: [{name: 'variableName', required: true, default: 'sentMessage'}, {name: 'channelId', required: true}, {name: 'message', required: true}], authProvider: 'discord', category: 'social-executions' },
  { type: 'DISCORD_EDIT_MESSAGE', nodeType: 'execution', name: 'Discord: Edit Message', icon: '/logos/discord.svg', description: 'Edit a Discord message', fields: [{name: 'variableName', required: true, default: 'editedMessage'}, {name: 'channelId', required: true}, {name: 'messageId', required: true}, {name: 'message', required: true}], authProvider: 'discord', category: 'social-executions' },
  { type: 'DISCORD_SEND_EMBED', nodeType: 'execution', name: 'Discord: Send Embed', icon: '/logos/discord.svg', description: 'Send an embed message to Discord', fields: [{name: 'variableName', required: true, default: 'sentEmbed'}, {name: 'channelId', required: true}, {name: 'title', required: true}, {name: 'description', required: true}], authProvider: 'discord', category: 'social-executions' },
  { type: 'DISCORD_SEND_DM', nodeType: 'execution', name: 'Discord: Send DM', icon: '/logos/discord.svg', description: 'Send a direct message in Discord', fields: [{name: 'variableName', required: true, default: 'sentDM'}, {name: 'userId', required: true}, {name: 'message', required: true}], authProvider: 'discord', category: 'social-executions' },
  
  // Telegram Triggers (2)
  { type: 'TELEGRAM_NEW_MESSAGE', nodeType: 'trigger', name: 'Telegram: New Message', icon: '/logos/telegram.svg', description: 'Triggers when a new Telegram message is received', fields: [{name: 'variableName', required: true, default: 'newMessage'}], authProvider: 'telegram', category: 'social-triggers' },
  { type: 'TELEGRAM_COMMAND_RECEIVED', nodeType: 'trigger', name: 'Telegram: Command Received', icon: '/logos/telegram.svg', description: 'Triggers when a bot command is received', fields: [{name: 'variableName', required: true, default: 'command'}, {name: 'commandName', required: true}], authProvider: 'telegram', category: 'social-triggers' },
  
  // Telegram Executions (3)
  { type: 'TELEGRAM_SEND_MESSAGE', nodeType: 'execution', name: 'Telegram: Send Message', icon: '/logos/telegram.svg', description: 'Send a message via Telegram', fields: [{name: 'variableName', required: true, default: 'sentMessage'}, {name: 'chatId', required: true}, {name: 'message', required: true}], authProvider: 'telegram', category: 'social-executions' },
  { type: 'TELEGRAM_SEND_PHOTO', nodeType: 'execution', name: 'Telegram: Send Photo', icon: '/logos/telegram.svg', description: 'Send a photo via Telegram', fields: [{name: 'variableName', required: true, default: 'sentPhoto'}, {name: 'chatId', required: true}, {name: 'photoUrl', required: true}], authProvider: 'telegram', category: 'social-executions' },
  { type: 'TELEGRAM_SEND_DOCUMENT', nodeType: 'execution', name: 'Telegram: Send Document', icon: '/logos/telegram.svg', description: 'Send a document via Telegram', fields: [{name: 'variableName', required: true, default: 'sentDocument'}, {name: 'chatId', required: true}, {name: 'documentUrl', required: true}], authProvider: 'telegram', category: 'social-executions' },
  
  // Appointment Triggers (2)
  { type: 'APPOINTMENT_CREATED_TRIGGER', nodeType: 'trigger', name: 'Appointment Created', icon: 'CalendarIcon', description: 'Triggers when an appointment is created', fields: [{name: 'variableName', required: true, default: 'newAppointment'}], category: 'crm-triggers' },
  { type: 'APPOINTMENT_CANCELLED_TRIGGER', nodeType: 'trigger', name: 'Appointment Cancelled', icon: 'CalendarXIcon', description: 'Triggers when an appointment is cancelled', fields: [{name: 'variableName', required: true, default: 'cancelledAppointment'}], category: 'crm-triggers' },
  
  // Appointment Executions (3)
  { type: 'SCHEDULE_APPOINTMENT', nodeType: 'execution', name: 'Schedule Appointment', icon: 'CalendarPlusIcon', description: 'Schedule a new appointment', fields: [{name: 'variableName', required: true, default: 'scheduledAppointment'}, {name: 'title', required: true}, {name: 'startTime', required: true}, {name: 'endTime', required: true}], category: 'crm-executions' },
  { type: 'UPDATE_APPOINTMENT', nodeType: 'execution', name: 'Update Appointment', icon: 'CalendarEditIcon', description: 'Update an existing appointment', fields: [{name: 'variableName', required: true, default: 'updatedAppointment'}, {name: 'appointmentId', required: true}], category: 'crm-executions' },
  { type: 'CANCEL_APPOINTMENT', nodeType: 'execution', name: 'Cancel Appointment', icon: 'CalendarXIcon', description: 'Cancel an appointment', fields: [{name: 'variableName', required: true, default: 'result'}, {name: 'appointmentId', required: true}], category: 'crm-executions' },
  
  // Stripe Triggers (5)
  { type: 'STRIPE_PAYMENT_SUCCEEDED', nodeType: 'trigger', name: 'Stripe: Payment Succeeded', icon: '/logos/stripe.svg', description: 'Triggers when a payment succeeds', fields: [{name: 'variableName', required: true, default: 'payment'}], authProvider: 'stripe', category: 'payment-triggers' },
  { type: 'STRIPE_PAYMENT_FAILED', nodeType: 'trigger', name: 'Stripe: Payment Failed', icon: '/logos/stripe.svg', description: 'Triggers when a payment fails', fields: [{name: 'variableName', required: true, default: 'failedPayment'}], authProvider: 'stripe', category: 'payment-triggers' },
  { type: 'STRIPE_SUBSCRIPTION_CREATED', nodeType: 'trigger', name: 'Stripe: Subscription Created', icon: '/logos/stripe.svg', description: 'Triggers when a subscription is created', fields: [{name: 'variableName', required: true, default: 'subscription'}], authProvider: 'stripe', category: 'payment-triggers' },
  { type: 'STRIPE_SUBSCRIPTION_UPDATED', nodeType: 'trigger', name: 'Stripe: Subscription Updated', icon: '/logos/stripe.svg', description: 'Triggers when a subscription is updated', fields: [{name: 'variableName', required: true, default: 'subscription'}], authProvider: 'stripe', category: 'payment-triggers' },
  { type: 'STRIPE_SUBSCRIPTION_CANCELLED', nodeType: 'trigger', name: 'Stripe: Subscription Cancelled', icon: '/logos/stripe.svg', description: 'Triggers when a subscription is cancelled', fields: [{name: 'variableName', required: true, default: 'subscription'}], authProvider: 'stripe', category: 'payment-triggers' },
  
  // Stripe Executions (4)
  { type: 'STRIPE_CREATE_CHECKOUT_SESSION', nodeType: 'execution', name: 'Stripe: Create Checkout Session', icon: '/logos/stripe.svg', description: 'Create a Stripe checkout session', fields: [{name: 'variableName', required: true, default: 'checkoutSession'}, {name: 'priceId', required: true}, {name: 'successUrl', required: true}, {name: 'cancelUrl', required: true}], authProvider: 'stripe', category: 'payment-executions' },
  { type: 'STRIPE_CREATE_INVOICE', nodeType: 'execution', name: 'Stripe: Create Invoice', icon: '/logos/stripe.svg', description: 'Create a Stripe invoice', fields: [{name: 'variableName', required: true, default: 'invoice'}, {name: 'customerId', required: true}, {name: 'amount', required: true}], authProvider: 'stripe', category: 'payment-executions' },
  { type: 'STRIPE_SEND_INVOICE', nodeType: 'execution', name: 'Stripe: Send Invoice', icon: '/logos/stripe.svg', description: 'Send a Stripe invoice', fields: [{name: 'variableName', required: true, default: 'sentInvoice'}, {name: 'invoiceId', required: true}], authProvider: 'stripe', category: 'payment-executions' },
  { type: 'STRIPE_REFUND_PAYMENT', nodeType: 'execution', name: 'Stripe: Refund Payment', icon: '/logos/stripe.svg', description: 'Refund a Stripe payment', fields: [{name: 'variableName', required: true, default: 'refund'}, {name: 'paymentIntentId', required: true}], authProvider: 'stripe', category: 'payment-executions' },
  
  // Gemini AI (4)
  { type: 'GEMINI_GENERATE_TEXT', nodeType: 'execution', name: 'Gemini: Generate Text', icon: 'SparklesIcon', description: 'Generate text using Gemini AI', fields: [{name: 'variableName', required: true, default: 'generatedText'}, {name: 'prompt', required: true}], category: 'ai-executions' },
  { type: 'GEMINI_SUMMARISE', nodeType: 'execution', name: 'Gemini: Summarise', icon: 'FileTextIcon', description: 'Summarise text using Gemini AI', fields: [{name: 'variableName', required: true, default: 'summary'}, {name: 'text', required: true}], category: 'ai-executions' },
  { type: 'GEMINI_TRANSFORM', nodeType: 'execution', name: 'Gemini: Transform', icon: 'WandIcon', description: 'Transform text using Gemini AI', fields: [{name: 'variableName', required: true, default: 'transformedText'}, {name: 'text', required: true}, {name: 'instructions', required: true}], category: 'ai-executions' },
  { type: 'GEMINI_CLASSIFY', nodeType: 'execution', name: 'Gemini: Classify', icon: 'TagsIcon', description: 'Classify text using Gemini AI', fields: [{name: 'variableName', required: true, default: 'classification'}, {name: 'text', required: true}, {name: 'categories', required: true}], category: 'ai-executions' },
  
  // Execute Workflow (1)
  { type: 'EXECUTE_WORKFLOW', nodeType: 'execution', name: 'Execute Workflow', icon: 'WorkflowIcon', description: 'Execute another workflow', fields: [{name: 'variableName', required: true, default: 'workflowResult'}, {name: 'workflowId', required: true}], category: 'logic-executions' },
];

// ============================================================================
// FILE GENERATION FUNCTIONS
// ============================================================================

function toKebabCase(str: string): string {
  return str.toLowerCase().replace(/_/g, '-');
}

function toCamelCase(str: string): string {
  return str.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// Generate channel file
function generateChannelFile(spec: NodeSpec): string {
  const channelName = toKebabCase(spec.type);
  const pascalName = toPascalCase(spec.type);
  
  return `import { channel, topic } from "@inngest/realtime";

export const ${spec.type}_CHANNEL_NAME = "${channelName}-${spec.nodeType === 'trigger' ? 'trigger' : 'execution'}";

export const ${toCamelCase(spec.type)}Channel = channel(
  ${spec.type}_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
`;
}

// Generate executor file for TRIGGERS
function generateTriggerExecutor(spec: NodeSpec): string {
  const camelName = toCamelCase(spec.type);
  const pascalName = toPascalCase(spec.type);
  const defaultVar = spec.fields.find(f => f.name === 'variableName')?.default || 'data';
  
  return `import type { NodeExecutor } from "@/features/executions/types";
import { ${camelName}Channel } from "@/inngest/channels/${toKebabCase(spec.type)}";

export interface ${pascalName}Config {
  variableName?: string;
}

export const ${camelName}Executor: NodeExecutor<${pascalName}Config> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(${camelName}Channel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(${camelName}Channel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(${camelName}Channel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "${defaultVar}";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
`;
}

// Generate executor file for EXECUTIONS
function generateExecutionExecutor(spec: NodeSpec): string {
  const camelName = toCamelCase(spec.type);
  const pascalName = toPascalCase(spec.type);
  const defaultVar = spec.fields.find(f => f.name === 'variableName')?.default || 'result';
  
  // Build field types
  const fieldTypes = spec.fields
    .filter(f => f.name !== 'variableName')
    .map(f => `  ${f.name}${f.required ? '' : '?'}: string;`)
    .join('\n');
  
  return `import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { ${camelName}Channel } from "@/inngest/channels/${toKebabCase(spec.type)}";
import { decode } from "html-entities";

type ${pascalName}Data = {
  variableName?: string;
${fieldTypes}
};

export const ${camelName}Executor: NodeExecutor<${pascalName}Data> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(${camelName}Channel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
${spec.fields.filter(f => f.required && f.name !== 'variableName').map(f => `    if (!data.${f.name}) {
      await publish(${camelName}Channel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("${spec.name} error: ${f.name} is required.");
    }`).join('\n\n')}

    // Compile fields with Handlebars
${spec.fields.filter(f => f.name !== 'variableName').map(f => `    const ${f.name} = data.${f.name} ? decode(Handlebars.compile(data.${f.name})(context)) : undefined;`).join('\n')}

    // TODO: Implement ${spec.name} logic here
    const result = await step.run("${toKebabCase(spec.type)}", async () => {
      // Add implementation here
      throw new NonRetriableError("${spec.name}: Not yet implemented");
    });

    await publish(${camelName}Channel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(${camelName}Channel().status({ nodeId, status: "error" }));
    throw error;
  }
};
`;
}

// Generate dialog file
function generateDialogFile(spec: NodeSpec): string {
  const pascalName = toPascalCase(spec.type);
  const defaultVar = spec.fields.find(f => f.name === 'variableName')?.default || 'result';
  
  // Build Zod schema
  const zodFields = spec.fields.map(f => {
    if (f.name === 'variableName') {
      return `  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),`;
    }
    return `  ${f.name}: z.string()${f.required ? '.min(1, "' + f.name.charAt(0).toUpperCase() + f.name.slice(1) + ' is required")' : '.optional()'},`;
  }).join('\n');
  
  // Build form fields
  const formFields = spec.fields.map(f => {
    const label = f.name.split(/(?=[A-Z])/).join(' ').charAt(0).toUpperCase() + f.name.split(/(?=[A-Z])/).join(' ').slice(1);
    
    if (f.name === 'variableName') {
      return `            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="${defaultVar}" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference the result in other nodes using this variable name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />`;
    }
    
    return `            <FormField
              control={form.control}
              name="${f.name}"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>${label}</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="${f.name} or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />`;
  }).join('\n\n');
  
  return `"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";

import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

const formSchema = z.object({
${zodFields}
});

export type ${pascalName}FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ${pascalName}FormValues) => void;
  defaultValues?: Partial<${pascalName}FormValues>;
  variables: VariableItem[];
}

export const ${pascalName}Dialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "${defaultVar}",
${spec.fields.filter(f => f.name !== 'variableName').map(f => `      ${f.name}: defaultValues.${f.name} || "",`).join('\n')}
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "${defaultVar}",
${spec.fields.filter(f => f.name !== 'variableName').map(f => `        ${f.name}: defaultValues.${f.name} || "",`).join('\n')}
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>${spec.name} Configuration</SheetTitle>
          <SheetDescription>
            ${spec.description}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6"
          >
${formFields}

            <SheetFooter className="px-0 pb-4">
              <Button
                type="submit"
                className="w-max ml-auto"
                variant="gradient"
              >
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
`;
}

// Generate node component file
function generateNodeFile(spec: NodeSpec): string {
  const pascalName = toPascalCase(spec.type);
  const camelName = toCamelCase(spec.type);
  const channelName = spec.type + '_CHANNEL_NAME';
  const kebabName = toKebabCase(spec.type);
  const nodeClass = spec.nodeType === 'trigger' ? 'BaseTriggerNode' : 'BaseExecutionNode';
  
  const iconImport = spec.icon.startsWith('/') 
    ? `// Icon will be loaded from ${spec.icon}`
    : `import { ${spec.icon} } from "central-icons/${spec.icon}";`;
  
  const iconUsage = spec.icon.startsWith('/') 
    ? `icon="${spec.icon}"`
    : `icon={${spec.icon}}`;
  
  return `"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { ${nodeClass} } from "@/features/nodes/${spec.nodeType === 'trigger' ? 'triggers' : 'executions'}/base-${spec.nodeType}-node";
import { ${pascalName}Dialog, type ${pascalName}FormValues } from "./dialog";
${spec.nodeType === 'execution' ? `import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetch${pascalName}RealtimeToken } from "./actions";
import { ${channelName} } from "@/inngest/channels/${kebabName}";` : ''}
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
${iconImport}
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type ${pascalName}NodeData = ${pascalName}FormValues;

type ${pascalName}NodeType = Node<${pascalName}NodeData>;

export const ${pascalName}Node: React.FC<NodeProps<${pascalName}NodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as ${pascalName}NodeData) || nodeData;
    }, [dialogOpen, getNodes, props.id, nodeData]);

    const variables = useMemo(() => {
      if (!dialogOpen) return [];
      const nodes = getNodes();
      const edges = getEdges();
      return buildNodeContext(props.id, nodes, edges, {
        isBundle: workflowContext.isBundle,
        bundleInputs: workflowContext.bundleInputs,
        bundleWorkflowName: workflowContext.workflowName,
        parentWorkflowContext: workflowContext.parentWorkflowContext,
      });
    }, [props.id, getNodes, getEdges, dialogOpen, workflowContext]);

    const description = "${spec.description}";
${spec.nodeType === 'execution' ? `
    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: ${channelName},
      topic: "status",
      refreshToken: fetch${pascalName}RealtimeToken as any,
    });` : ''}

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: ${pascalName}FormValues) => {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === props.id) {
            return {
              ...node,
              data: {
                ...node.data,
                ...values,
              },
            };
          }

          return node;
        })
      );
    };

    return (
      <>
        <${pascalName}Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <${nodeClass}
          {...props}
          id={props.id}
          ${iconUsage}
          name="${spec.name}"
          description={description}
          ${spec.nodeType === 'execution' ? 'status={nodeStatus}' : ''}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

${pascalName}Node.displayName = "${pascalName}Node";
`;
}

// Generate actions file (only for execution nodes)
function generateActionsFile(spec: NodeSpec): string {
  const pascalName = toPascalCase(spec.type);
  const camelName = toCamelCase(spec.type);
  const kebabName = toKebabCase(spec.type);
  
  return `"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { ${camelName}Channel } from "@/inngest/channels/${kebabName}";

export type ${pascalName}Token = Realtime.Token<
  typeof ${camelName}Channel,
  ["status"]
>;

export async function fetch${pascalName}RealtimeToken(): Promise<${pascalName}Token> {
  const token = await getSubscriptionToken(inngest, {
    channel: ${camelName}Channel(),
    topics: ["status"],
  });

  return token;
}
`;
}

// ============================================================================
// MAIN GENERATION LOGIC
// ============================================================================

async function generateAllNodes() {
  console.log(`🚀 Generating ${ALL_NODES.length} workflow nodes...\n`);
  
  const baseDir = path.join(__dirname, 'src');
  const channelsDir = path.join(baseDir, 'inngest', 'channels');
  const triggersDir = path.join(baseDir, 'features', 'nodes', 'triggers', 'components');
  const executionsDir = path.join(baseDir, 'features', 'nodes', 'executions', 'components');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const spec of ALL_NODES) {
    try {
      const kebabName = toKebabCase(spec.type);
      const nodeDir = spec.nodeType === 'trigger' 
        ? path.join(triggersDir, kebabName)
        : path.join(executionsDir, kebabName);
      
      // Create directories
      if (!fs.existsSync(nodeDir)) {
        fs.mkdirSync(nodeDir, { recursive: true });
      }
      
      // Generate files
      const channelPath = path.join(channelsDir, `${kebabName}.ts`);
      fs.writeFileSync(channelPath, generateChannelFile(spec));
      
      const executorPath = path.join(nodeDir, 'executor.ts');
      const executorContent = spec.nodeType === 'trigger'
        ? generateTriggerExecutor(spec)
        : generateExecutionExecutor(spec);
      fs.writeFileSync(executorPath, executorContent);
      
      const dialogPath = path.join(nodeDir, 'dialog.tsx');
      fs.writeFileSync(dialogPath, generateDialogFile(spec));
      
      const nodePath = path.join(nodeDir, 'node.tsx');
      fs.writeFileSync(nodePath, generateNodeFile(spec));
      
      if (spec.nodeType === 'execution') {
        const actionsPath = path.join(nodeDir, 'actions.ts');
        fs.writeFileSync(actionsPath, generateActionsFile(spec));
      }
      
      console.log(`✅ Generated: ${spec.type}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error generating ${spec.type}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n✨ Generation complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Register nodes in src/config/node-components.ts`);
  console.log(`   2. Register executors in src/features/executions/lib/executor-registry.ts`);
  console.log(`   3. Add nodes to node-selector.tsx`);
  console.log(`   4. Implement the TODO sections in executor files`);
}

// Run the generator
generateAllNodes().catch(console.error);
