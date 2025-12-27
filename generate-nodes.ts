/**
 * Node Generation Script
 * This script generates all missing workflow nodes following the established patterns
 * Run with: npx tsx generate-nodes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// NODE SPECIFICATIONS
// ============================================================================

type FieldType = 'string' | 'textarea' | 'email' | 'select' | 'boolean' | 'number';
type ValidationRule = 'email' | 'url' | 'min' | 'max';

interface NodeField {
  name: string;
  type: FieldType;
  required: boolean;
  label: string;
  placeholder?: string;
  description?: string;
  validation?: ValidationRule;
  options?: string; // For select fields - enum name or array
  default?: string;
}

interface ExecutorConfig {
  requiresAuth?: 'slack' | 'discord' | 'telegram' | 'google' | 'microsoft' | 'stripe';
  usePrisma?: boolean;
  model?: string;
  operation?: 'create' | 'update' | 'delete' | 'findUnique' | 'findMany';
  requiresOrgContext?: boolean;
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  bodyMapping?: Record<string, string>;
  customLogic?: string;
  isTrigger?: boolean;
  passthrough?: boolean;
  outputFields?: string[];
}

interface NodeSpec {
  type: string;
  nodeType: 'trigger' | 'execution';
  name: string;
  icon: string;
  description: string;
  category: string;
  fields: NodeField[];
  executor: ExecutorConfig;
  defaultVariableName?: string;
}

// ============================================================================
// ALL NODE SPECIFICATIONS
// ============================================================================

const nodeSpecs: NodeSpec[] = [
  // ==========================================================================
  // GOOGLE CALENDAR EVENT TRIGGERS
  // ==========================================================================
  {
    type: 'GOOGLE_CALENDAR_EVENT_CREATED',
    nodeType: 'trigger',
    name: 'Google Calendar: Event Created',
    icon: '/logos/googlecalendar.svg',
    description: 'Triggers when a new calendar event is created',
    category: 'google-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'newEvent', placeholder: 'newEvent' },
      { name: 'calendarId', type: 'string', required: true, label: 'Calendar ID', placeholder: 'primary' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'google',
      outputFields: ['id', 'summary', 'description', 'start', 'end', 'attendees']
    },
    defaultVariableName: 'newEvent'
  },
  {
    type: 'GOOGLE_CALENDAR_EVENT_UPDATED',
    nodeType: 'trigger',
    name: 'Google Calendar: Event Updated',
    icon: '/logos/googlecalendar.svg',
    description: 'Triggers when a calendar event is updated',
    category: 'google-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'updatedEvent', placeholder: 'updatedEvent' },
      { name: 'calendarId', type: 'string', required: true, label: 'Calendar ID', placeholder: 'primary' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'google',
      outputFields: ['id', 'summary', 'description', 'start', 'end', 'attendees']
    },
    defaultVariableName: 'updatedEvent'
  },
  {
    type: 'GOOGLE_CALENDAR_EVENT_DELETED',
    nodeType: 'trigger',
    name: 'Google Calendar: Event Deleted',
    icon: '/logos/googlecalendar.svg',
    description: 'Triggers when a calendar event is deleted',
    category: 'google-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'deletedEvent', placeholder: 'deletedEvent' },
      { name: 'calendarId', type: 'string', required: true, label: 'Calendar ID', placeholder: 'primary' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'google',
      outputFields: ['id', 'summary']
    },
    defaultVariableName: 'deletedEvent'
  },

  // ==========================================================================
  // GOOGLE DRIVE TRIGGERS
  // ==========================================================================
  {
    type: 'GOOGLE_DRIVE_FILE_CREATED',
    nodeType: 'trigger',
    name: 'Google Drive: File Created',
    icon: '/logos/googledrive.svg',
    description: 'Triggers when a new file is created in Google Drive',
    category: 'google-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'newFile', placeholder: 'newFile' },
      { name: 'folderId', type: 'string', required: false, label: 'Folder ID', placeholder: 'Watch specific folder (optional)' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'google',
      outputFields: ['id', 'name', 'mimeType', 'webViewLink', 'createdTime']
    },
    defaultVariableName: 'newFile'
  },
  {
    type: 'GOOGLE_DRIVE_FILE_UPDATED',
    nodeType: 'trigger',
    name: 'Google Drive: File Updated',
    icon: '/logos/googledrive.svg',
    description: 'Triggers when a file is updated in Google Drive',
    category: 'google-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'updatedFile', placeholder: 'updatedFile' },
      { name: 'folderId', type: 'string', required: false, label: 'Folder ID', placeholder: 'Watch specific folder (optional)' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'google',
      outputFields: ['id', 'name', 'mimeType', 'modifiedTime']
    },
    defaultVariableName: 'updatedFile'
  },
  {
    type: 'GOOGLE_DRIVE_FILE_DELETED',
    nodeType: 'trigger',
    name: 'Google Drive: File Deleted',
    icon: '/logos/googledrive.svg',
    description: 'Triggers when a file is deleted from Google Drive',
    category: 'google-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'deletedFile', placeholder: 'deletedFile' },
      { name: 'folderId', type: 'string', required: false, label: 'Folder ID', placeholder: 'Watch specific folder (optional)' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'google',
      outputFields: ['id', 'name']
    },
    defaultVariableName: 'deletedFile'
  },
  {
    type: 'GOOGLE_DRIVE_FOLDER_CREATED',
    nodeType: 'trigger',
    name: 'Google Drive: Folder Created',
    icon: '/logos/googledrive.svg',
    description: 'Triggers when a new folder is created in Google Drive',
    category: 'google-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'newFolder', placeholder: 'newFolder' },
      { name: 'parentFolderId', type: 'string', required: false, label: 'Parent Folder ID', placeholder: 'Watch specific folder (optional)' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'google',
      outputFields: ['id', 'name', 'webViewLink', 'createdTime']
    },
    defaultVariableName: 'newFolder'
  },

  // ==========================================================================
  // GOOGLE EXECUTIONS
  // ==========================================================================
  {
    type: 'GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES',
    nodeType: 'execution',
    name: 'Google Calendar: Find Available Times',
    icon: '/logos/googlecalendar.svg',
    description: 'Find available time slots in Google Calendar',
    category: 'google-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'availableTimes', placeholder: 'availableTimes' },
      { name: 'calendarId', type: 'string', required: true, label: 'Calendar ID', placeholder: 'primary or @variables' },
      { name: 'timeMin', type: 'string', required: true, label: 'Start Time', placeholder: '2024-01-01T09:00:00Z' },
      { name: 'timeMax', type: 'string', required: true, label: 'End Time', placeholder: '2024-01-01T17:00:00Z' },
      { name: 'duration', type: 'number', required: true, label: 'Duration (minutes)', placeholder: '30' }
    ],
    executor: {
      requiresAuth: 'google',
      customLogic: 'findAvailableTimes',
      outputFields: ['availableSlots', 'count']
    },
    defaultVariableName: 'availableTimes'
  },
  {
    type: 'GOOGLE_FORM_CREATE_RESPONSE',
    nodeType: 'execution',
    name: 'Google Forms: Create Response',
    icon: '/logos/googleform.svg',
    description: 'Submit a response to a Google Form',
    category: 'google-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'formResponse', placeholder: 'formResponse' },
      { name: 'formId', type: 'string', required: true, label: 'Form ID', placeholder: 'Form ID or @variables' },
      { name: 'responses', type: 'textarea', required: true, label: 'Responses (JSON)', placeholder: '{"question1": "answer1"}' }
    ],
    executor: {
      requiresAuth: 'google',
      customLogic: 'createFormResponse',
      outputFields: ['responseId', 'timestamp']
    },
    defaultVariableName: 'formResponse'
  },

  // ==========================================================================
  // OUTLOOK EMAIL TRIGGERS
  // ==========================================================================
  {
    type: 'OUTLOOK_NEW_EMAIL',
    nodeType: 'trigger',
    name: 'Outlook: New Email',
    icon: '/logos/outlook.svg',
    description: 'Triggers when a new email arrives in Outlook',
    category: 'microsoft-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'newEmail', placeholder: 'newEmail' },
      { name: 'folderId', type: 'string', required: false, label: 'Folder ID', placeholder: 'inbox (optional)' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'microsoft',
      outputFields: ['id', 'subject', 'from', 'bodyPreview', 'receivedDateTime']
    },
    defaultVariableName: 'newEmail'
  },
  {
    type: 'OUTLOOK_EMAIL_MOVED',
    nodeType: 'trigger',
    name: 'Outlook: Email Moved',
    icon: '/logos/outlook.svg',
    description: 'Triggers when an email is moved to a folder',
    category: 'microsoft-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'movedEmail', placeholder: 'movedEmail' },
      { name: 'folderId', type: 'string', required: true, label: 'Folder ID', placeholder: 'Target folder ID' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'microsoft',
      outputFields: ['id', 'subject', 'from', 'folderId']
    },
    defaultVariableName: 'movedEmail'
  },
  {
    type: 'OUTLOOK_EMAIL_DELETED',
    nodeType: 'trigger',
    name: 'Outlook: Email Deleted',
    icon: '/logos/outlook.svg',
    description: 'Triggers when an email is deleted',
    category: 'microsoft-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'deletedEmail', placeholder: 'deletedEmail' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'microsoft',
      outputFields: ['id', 'subject']
    },
    defaultVariableName: 'deletedEmail'
  },

  // ==========================================================================
  // OUTLOOK EMAIL EXECUTIONS
  // ==========================================================================
  {
    type: 'OUTLOOK_SEND_EMAIL',
    nodeType: 'execution',
    name: 'Outlook: Send Email',
    icon: '/logos/outlook.svg',
    description: 'Send an email via Outlook',
    category: 'microsoft-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'sentEmail', placeholder: 'sentEmail' },
      { name: 'to', type: 'string', required: true, label: 'To', placeholder: 'recipient@example.com' },
      { name: 'subject', type: 'string', required: true, label: 'Subject', placeholder: 'Email subject' },
      { name: 'body', type: 'textarea', required: true, label: 'Body', placeholder: 'Email body' },
      { name: 'cc', type: 'string', required: false, label: 'CC', placeholder: 'cc@example.com (optional)' },
      { name: 'bcc', type: 'string', required: false, label: 'BCC', placeholder: 'bcc@example.com (optional)' }
    ],
    executor: {
      requiresAuth: 'microsoft',
      customLogic: 'sendOutlookEmail',
      outputFields: ['messageId', 'sentDateTime']
    },
    defaultVariableName: 'sentEmail'
  },
  {
    type: 'OUTLOOK_REPLY_TO_EMAIL',
    nodeType: 'execution',
    name: 'Outlook: Reply to Email',
    icon: '/logos/outlook.svg',
    description: 'Reply to an email in Outlook',
    category: 'microsoft-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'reply', placeholder: 'reply' },
      { name: 'messageId', type: 'string', required: true, label: 'Message ID', placeholder: '@email.id or message ID' },
      { name: 'body', type: 'textarea', required: true, label: 'Reply Body', placeholder: 'Your reply' },
      { name: 'replyAll', type: 'boolean', required: false, label: 'Reply All', default: 'false' }
    ],
    executor: {
      requiresAuth: 'microsoft',
      customLogic: 'replyToOutlookEmail',
      outputFields: ['messageId', 'sentDateTime']
    },
    defaultVariableName: 'reply'
  },
  {
    type: 'OUTLOOK_MOVE_EMAIL',
    nodeType: 'execution',
    name: 'Outlook: Move Email',
    icon: '/logos/outlook.svg',
    description: 'Move an email to a different folder',
    category: 'microsoft-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'movedEmail', placeholder: 'movedEmail' },
      { name: 'messageId', type: 'string', required: true, label: 'Message ID', placeholder: '@email.id or message ID' },
      { name: 'destinationFolderId', type: 'string', required: true, label: 'Destination Folder ID', placeholder: 'Folder ID' }
    ],
    executor: {
      requiresAuth: 'microsoft',
      customLogic: 'moveOutlookEmail',
      outputFields: ['messageId', 'folderId']
    },
    defaultVariableName: 'movedEmail'
  },
  {
    type: 'OUTLOOK_SEARCH_EMAILS',
    nodeType: 'execution',
    name: 'Outlook: Search Emails',
    icon: '/logos/outlook.svg',
    description: 'Search emails in Outlook',
    category: 'microsoft-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'searchResults', placeholder: 'searchResults' },
      { name: 'query', type: 'string', required: true, label: 'Search Query', placeholder: 'subject:invoice' },
      { name: 'maxResults', type: 'number', required: false, label: 'Max Results', default: '10', placeholder: '10' }
    ],
    executor: {
      requiresAuth: 'microsoft',
      customLogic: 'searchOutlookEmails',
      outputFields: ['emails', 'count']
    },
    defaultVariableName: 'searchResults'
  },

  // ==========================================================================
  // ONEDRIVE TRIGGERS
  // ==========================================================================
  {
    type: 'ONEDRIVE_FILE_CREATED',
    nodeType: 'trigger',
    name: 'OneDrive: File Created',
    icon: '/logos/onedrive.svg',
    description: 'Triggers when a new file is created in OneDrive',
    category: 'microsoft-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'newFile', placeholder: 'newFile' },
      { name: 'folderId', type: 'string', required: false, label: 'Folder ID', placeholder: 'Watch specific folder (optional)' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'microsoft',
      outputFields: ['id', 'name', 'webUrl', 'createdDateTime']
    },
    defaultVariableName: 'newFile'
  },
  {
    type: 'ONEDRIVE_FILE_UPDATED',
    nodeType: 'trigger',
    name: 'OneDrive: File Updated',
    icon: '/logos/onedrive.svg',
    description: 'Triggers when a file is updated in OneDrive',
    category: 'microsoft-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'updatedFile', placeholder: 'updatedFile' },
      { name: 'folderId', type: 'string', required: false, label: 'Folder ID', placeholder: 'Watch specific folder (optional)' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'microsoft',
      outputFields: ['id', 'name', 'lastModifiedDateTime']
    },
    defaultVariableName: 'updatedFile'
  },
  {
    type: 'ONEDRIVE_FILE_DELETED',
    nodeType: 'trigger',
    name: 'OneDrive: File Deleted',
    icon: '/logos/onedrive.svg',
    description: 'Triggers when a file is deleted from OneDrive',
    category: 'microsoft-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'deletedFile', placeholder: 'deletedFile' },
      { name: 'folderId', type: 'string', required: false, label: 'Folder ID', placeholder: 'Watch specific folder (optional)' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'microsoft',
      outputFields: ['id', 'name']
    },
    defaultVariableName: 'deletedFile'
  },

  // ==========================================================================
  // ONEDRIVE EXECUTIONS
  // ==========================================================================
  {
    type: 'ONEDRIVE_UPLOAD_FILE',
    nodeType: 'execution',
    name: 'OneDrive: Upload File',
    icon: '/logos/onedrive.svg',
    description: 'Upload a file to OneDrive',
    category: 'microsoft-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'uploadedFile', placeholder: 'uploadedFile' },
      { name: 'fileName', type: 'string', required: true, label: 'File Name', placeholder: 'document.pdf' },
      { name: 'fileContent', type: 'textarea', required: true, label: 'File Content', placeholder: 'Base64 or URL' },
      { name: 'folderId', type: 'string', required: false, label: 'Folder ID', placeholder: 'Destination folder (optional)' }
    ],
    executor: {
      requiresAuth: 'microsoft',
      customLogic: 'uploadOneDriveFile',
      outputFields: ['id', 'name', 'webUrl']
    },
    defaultVariableName: 'uploadedFile'
  },
  {
    type: 'ONEDRIVE_DOWNLOAD_FILE',
    nodeType: 'execution',
    name: 'OneDrive: Download File',
    icon: '/logos/onedrive.svg',
    description: 'Download a file from OneDrive',
    category: 'microsoft-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'downloadedFile', placeholder: 'downloadedFile' },
      { name: 'fileId', type: 'string', required: true, label: 'File ID', placeholder: '@file.id or file ID' }
    ],
    executor: {
      requiresAuth: 'microsoft',
      customLogic: 'downloadOneDriveFile',
      outputFields: ['content', 'fileName', 'downloadUrl']
    },
    defaultVariableName: 'downloadedFile'
  },
  {
    type: 'ONEDRIVE_MOVE_FILE',
    nodeType: 'execution',
    name: 'OneDrive: Move File',
    icon: '/logos/onedrive.svg',
    description: 'Move a file to a different folder in OneDrive',
    category: 'microsoft-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'movedFile', placeholder: 'movedFile' },
      { name: 'fileId', type: 'string', required: true, label: 'File ID', placeholder: '@file.id or file ID' },
      { name: 'destinationFolderId', type: 'string', required: true, label: 'Destination Folder ID', placeholder: 'Folder ID' }
    ],
    executor: {
      requiresAuth: 'microsoft',
      customLogic: 'moveOneDriveFile',
      outputFields: ['id', 'name', 'parentId']
    },
    defaultVariableName: 'movedFile'
  },
  {
    type: 'ONEDRIVE_DELETE_FILE',
    nodeType: 'execution',
    name: 'OneDrive: Delete File',
    icon: '/logos/onedrive.svg',
    description: 'Delete a file from OneDrive',
    category: 'microsoft-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'result', placeholder: 'result' },
      { name: 'fileId', type: 'string', required: true, label: 'File ID', placeholder: '@file.id or file ID' }
    ],
    executor: {
      requiresAuth: 'microsoft',
      customLogic: 'deleteOneDriveFile',
      outputFields: ['success', 'fileId']
    },
    defaultVariableName: 'result'
  },

  // Continue in next part...
];

// I'll split this into multiple parts due to length. Let me continue with the remaining node specs...


// ==========================================================================
// OUTLOOK CALENDAR TRIGGERS
// ==========================================================================
const outlookCalendarTriggers: NodeSpec[] = [
  {
    type: 'OUTLOOK_CALENDAR_EVENT_CREATED',
    nodeType: 'trigger',
    name: 'Outlook Calendar: Event Created',
    icon: '/logos/outlook.svg',
    description: 'Triggers when a new calendar event is created',
    category: 'microsoft-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'newEvent', placeholder: 'newEvent' },
      { name: 'calendarId', type: 'string', required: false, label: 'Calendar ID', placeholder: 'primary (optional)' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'microsoft',
      outputFields: ['id', 'subject', 'start', 'end', 'attendees']
    },
    defaultVariableName: 'newEvent'
  },
  {
    type: 'OUTLOOK_CALENDAR_EVENT_UPDATED',
    nodeType: 'trigger',
    name: 'Outlook Calendar: Event Updated',
    icon: '/logos/outlook.svg',
    description: 'Triggers when a calendar event is updated',
    category: 'microsoft-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'updatedEvent', placeholder: 'updatedEvent' },
      { name: 'calendarId', type: 'string', required: false, label: 'Calendar ID', placeholder: 'primary (optional)' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'microsoft',
      outputFields: ['id', 'subject', 'start', 'end']
    },
    defaultVariableName: 'updatedEvent'
  },
  {
    type: 'OUTLOOK_CALENDAR_EVENT_DELETED',
    nodeType: 'trigger',
    name: 'Outlook Calendar: Event Deleted',
    icon: '/logos/outlook.svg',
    description: 'Triggers when a calendar event is deleted',
    category: 'microsoft-triggers',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'deletedEvent', placeholder: 'deletedEvent' },
      { name: 'calendarId', type: 'string', required: false, label: 'Calendar ID', placeholder: 'primary (optional)' }
    ],
    executor: {
      isTrigger: true,
      passthrough: true,
      requiresAuth: 'microsoft',
      outputFields: ['id', 'subject']
    },
    defaultVariableName: 'deletedEvent'
  }
];

// ==========================================================================
// OUTLOOK CALENDAR EXECUTIONS
// ==========================================================================
const outlookCalendarExecutions: NodeSpec[] = [
  {
    type: 'OUTLOOK_CALENDAR_CREATE_EVENT',
    nodeType: 'execution',
    name: 'Outlook Calendar: Create Event',
    icon: '/logos/outlook.svg',
    description: 'Create a new event in Outlook Calendar',
    category: 'microsoft-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'createdEvent', placeholder: 'createdEvent' },
      { name: 'subject', type: 'string', required: true, label: 'Subject', placeholder: 'Meeting title' },
      { name: 'start', type: 'string', required: true, label: 'Start Time', placeholder: '2024-01-01T09:00:00' },
      { name: 'end', type: 'string', required: true, label: 'End Time', placeholder: '2024-01-01T10:00:00' },
      { name: 'body', type: 'textarea', required: false, label: 'Description', placeholder: 'Event description' },
      { name: 'attendees', type: 'string', required: false, label: 'Attendees', placeholder: 'email1@example.com,email2@example.com' }
    ],
    executor: {
      requiresAuth: 'microsoft',
      customLogic: 'createOutlookCalendarEvent',
      outputFields: ['id', 'subject', 'webLink']
    },
    defaultVariableName: 'createdEvent'
  },
  {
    type: 'OUTLOOK_CALENDAR_UPDATE_EVENT',
    nodeType: 'execution',
    name: 'Outlook Calendar: Update Event',
    icon: '/logos/outlook.svg',
    description: 'Update an existing event in Outlook Calendar',
    category: 'microsoft-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'updatedEvent', placeholder: 'updatedEvent' },
      { name: 'eventId', type: 'string', required: true, label: 'Event ID', placeholder: '@event.id or event ID' },
      { name: 'subject', type: 'string', required: false, label: 'Subject', placeholder: 'Updated title' },
      { name: 'start', type: 'string', required: false, label: 'Start Time', placeholder: '2024-01-01T09:00:00' },
      { name: 'end', type: 'string', required: false, label: 'End Time', placeholder: '2024-01-01T10:00:00' },
      { name: 'body', type: 'textarea', required: false, label: 'Description', placeholder: 'Updated description' }
    ],
    executor: {
      requiresAuth: 'microsoft',
      customLogic: 'updateOutlookCalendarEvent',
      outputFields: ['id', 'subject']
    },
    defaultVariableName: 'updatedEvent'
  },
  {
    type: 'OUTLOOK_CALENDAR_DELETE_EVENT',
    nodeType: 'execution',
    name: 'Outlook Calendar: Delete Event',
    icon: '/logos/outlook.svg',
    description: 'Delete an event from Outlook Calendar',
    category: 'microsoft-executions',
    fields: [
      { name: 'variableName', type: 'string', required: true, label: 'Variable Name', default: 'result', placeholder: 'result' },
      { name: 'eventId', type: 'string', required: true, label: 'Event ID', placeholder: '@event.id or event ID' }
    ],
    executor: {
      requiresAuth: 'microsoft',
      customLogic: 'deleteOutlookCalendarEvent',
      outputFields: ['success', 'eventId']
    },
    defaultVariableName: 'result'
  }
];

// Add all the category specs to main array
nodeSpecs.push(...outlookCalendarTriggers, ...outlookCalendarExecutions);

