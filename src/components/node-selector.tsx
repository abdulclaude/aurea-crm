"use client";

import { createId } from "@paralleldrive/cuid2";
import { useReactFlow } from "@xyflow/react";

import { IconWorld as HttpRequestIcon } from "central-icons/IconWorld";
import React, { useCallback, useState, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Bell,
  Cake,
  CalendarCheck,
  CalendarX,
  ChevronRight,
  CreditCard,
  Gift,
  FileCheck2,
  Handshake,
  HeartPulse,
  MessageSquare,
  Mail,
  Search,
  Trophy,
  UserCheck,
  UserMinus,
  Users,
  ShoppingBag,
  TimerOff,
  ListTodo,
  CalendarCheck2,
} from "lucide-react";

import { IconCursorClick as ManualTriggerIcon } from "central-icons/IconCursorClick";
import { IconPeopleAdd as CreateClientIcon } from "central-icons/IconPeopleAdd";
import { IconPeopleEdit as UpdateClientIcon } from "central-icons/IconPeopleEdit";
import { IconMagicEdit as ClientFieldChangedIcon } from "central-icons/IconMagicEdit";
import { IconPeopleRemove as ClientDeletedIcon } from "central-icons/IconPeopleRemove";
import { IconListSparkle as ClientTypeChangedIcon } from "central-icons/IconListSparkle";
import { IconLineChart3 as ClientLifecycleStageChangedIcon } from "central-icons/IconLineChart3";
import { IconCoinsAdd as CreateDealIcon } from "central-icons/IconCoinsAdd";
import { IconRewrite as DealEditIcon } from "central-icons/IconRewrite";
import { IconBranch as IfElseIcon } from "central-icons/IconBranch";
import { IconVariables as SetVariableIcon } from "central-icons/IconVariables";
import { IconStop as StopWorkflowIcon } from "central-icons/IconStop";
import { IconArrowRightLeft as SwitchIcon } from "central-icons/IconArrowRightLeft";
import { IconRepeat as LoopIcon } from "central-icons/IconRepeat";
import { IconImagineAi } from "central-icons/IconImagineAi";
import { IconTag as TagIcon } from "central-icons/IconTag";
import { IconArrowBoxRight as MoveDealIcon } from "central-icons/IconArrowBoxRight";
import { IconNote2 as NoteIcon } from "central-icons/IconNote2";
import { IconSquareGridMaginfyingGlass as FindClientsIcon } from "central-icons/IconSquareGridMaginfyingGlass";
import { IconCalendarAdd4 as CalendarAddIcon } from "central-icons/IconCalendarAdd4";
import { IconCalendarEdit as CalendarEditIcon } from "central-icons/IconCalendarEdit";
import { IconCalendarRemove4 as CalendarCancelIcon } from "central-icons/IconCalendarRemove4";
import { IconSparkle as SparkleIcon } from "central-icons/IconSparkle";
import { IconFileText as FileTextIcon } from "central-icons/IconFileText";
import { IconMagicWand as WandIcon } from "central-icons/IconMagicWand";
import { IconPlay as ExecuteIcon } from "central-icons/IconPlay";
import { BanknoteXIcon } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppProvider, NodeType } from "@/db/enums";
import type { JsonObject } from "@/db/json";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useSuspenseAppProviders } from "@/features/apps/hooks/use-apps";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "./ui/separator";
import { nodeTypeIsAvailable } from "@/features/nodes/lib/node-availability";
import { getNodeDefaultData } from "@/features/nodes/lib/node-default-data";
import { isWorkflowTriggerNodeType } from "@/features/workflows/lib/workflow-node-types";

export type NodeTypeOption = {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }> | string;
  requiresApp?: AppProvider;
  defaultData?: JsonObject;
};

// ========== TRIGGERS ==========

// Manual Trigger
const manualTriggerNode: NodeTypeOption = {
  type: NodeType.MANUAL_TRIGGER,
  label: "Trigger manually",
  description:
    "Runs the flow on clicking a button. Good for getting started quickly.",
  icon: ManualTriggerIcon,
};

// Google Triggers - Organized by subcategory
const googleCalendarTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.GOOGLE_CALENDAR_TRIGGER,
    label: "Google Calendar Event",
    description: "Runs the flow when a calendar event is created or updated.",
    icon: "/logos/googlecalendar.svg",
    requiresApp: AppProvider.GOOGLE_CALENDAR,
  },
  {
    type: NodeType.GOOGLE_CALENDAR_EVENT_CREATED,
    label: "Event Created",
    description: "Triggers when a new calendar event is created.",
    icon: "/logos/googlecalendar.svg",
    requiresApp: AppProvider.GOOGLE_CALENDAR,
  },
  {
    type: NodeType.GOOGLE_CALENDAR_EVENT_UPDATED,
    label: "Event Updated",
    description: "Triggers when a calendar event is updated.",
    icon: "/logos/googlecalendar.svg",
    requiresApp: AppProvider.GOOGLE_CALENDAR,
  },
  {
    type: NodeType.GOOGLE_CALENDAR_EVENT_DELETED,
    label: "Event Deleted",
    description: "Triggers when a calendar event is deleted.",
    icon: "/logos/googlecalendar.svg",
    requiresApp: AppProvider.GOOGLE_CALENDAR,
  },
];

const gmailTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.GMAIL_TRIGGER,
    label: "Gmail (new email)",
    description:
      "Listens for new messages in a label or query and exposes them to the workflow.",
    icon: "/logos/google.svg",
    requiresApp: AppProvider.GMAIL,
  },
];

const googleDriveTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.GOOGLE_DRIVE_FILE_CREATED,
    label: "File Created",
    description: "Triggers when a new file is created in Google Drive.",
    icon: "/logos/googledrive.svg",
    requiresApp: AppProvider.GOOGLE_DRIVE,
  },
  {
    type: NodeType.GOOGLE_DRIVE_FILE_UPDATED,
    label: "File Updated",
    description: "Triggers when a file is updated in Google Drive.",
    icon: "/logos/googledrive.svg",
    requiresApp: AppProvider.GOOGLE_DRIVE,
  },
  {
    type: NodeType.GOOGLE_DRIVE_FILE_DELETED,
    label: "File Deleted",
    description: "Triggers when a file is deleted from Google Drive.",
    icon: "/logos/googledrive.svg",
    requiresApp: AppProvider.GOOGLE_DRIVE,
  },
  {
    type: NodeType.GOOGLE_DRIVE_FOLDER_CREATED,
    label: "Folder Created",
    description: "Triggers when a new folder is created in Google Drive.",
    icon: "/logos/googledrive.svg",
    requiresApp: AppProvider.GOOGLE_DRIVE,
  },
];

const googleFormTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.GOOGLE_FORM_TRIGGER,
    label: "Google Form Submission",
    description: "Runs the flow when a Google Form is submitted.",
    icon: "/logos/googleform.svg",
  },
];

// All Google triggers combined
const googleTriggerNodes: NodeTypeOption[] = [
  ...googleCalendarTriggerNodes,
  ...gmailTriggerNodes,
  ...googleDriveTriggerNodes,
  ...googleFormTriggerNodes,
];

// Microsoft Triggers - Organized by subcategory
const outlookTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.OUTLOOK_TRIGGER,
    label: "Outlook (new email)",
    description: "Runs when a new email arrives in your Outlook inbox.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.OUTLOOK_NEW_EMAIL,
    label: "New Email",
    description: "Triggers when a new email is received.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.OUTLOOK_EMAIL_MOVED,
    label: "Email Moved",
    description: "Triggers when an email is moved to a folder.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.OUTLOOK_EMAIL_DELETED,
    label: "Email Deleted",
    description: "Triggers when an email is deleted.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
];

const onedriveTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.ONEDRIVE_TRIGGER,
    label: "OneDrive (file changed)",
    description: "Runs when files are added, modified, or deleted in OneDrive.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.ONEDRIVE_FILE_CREATED,
    label: "File Created",
    description: "Triggers when a new file is created in OneDrive.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.ONEDRIVE_FILE_UPDATED,
    label: "File Updated",
    description: "Triggers when a file is updated in OneDrive.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.ONEDRIVE_FILE_DELETED,
    label: "File Deleted",
    description: "Triggers when a file is deleted from OneDrive.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
];

const outlookCalendarTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.OUTLOOK_CALENDAR_EVENT_CREATED,
    label: "Event Created",
    description: "Triggers when a new Outlook calendar event is created.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.OUTLOOK_CALENDAR_EVENT_UPDATED,
    label: "Event Updated",
    description: "Triggers when an Outlook calendar event is updated.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.OUTLOOK_CALENDAR_EVENT_DELETED,
    label: "Event Deleted",
    description: "Triggers when an Outlook calendar event is deleted.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
];

// All Microsoft triggers combined
const microsoftTriggerNodes: NodeTypeOption[] = [
  ...outlookTriggerNodes,
  ...onedriveTriggerNodes,
  ...outlookCalendarTriggerNodes,
];

// Social/Communication Triggers
const slackTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.SLACK_NEW_MESSAGE,
    label: "New Message",
    description: "Triggers when a new message is posted in a Slack channel.",
    icon: "/logos/slack.svg",
    requiresApp: AppProvider.SLACK,
  },
  {
    type: NodeType.SLACK_MESSAGE_REACTION,
    label: "Message Reaction",
    description: "Triggers when a reaction is added to a Slack message.",
    icon: "/logos/slack.svg",
    requiresApp: AppProvider.SLACK,
  },
  {
    type: NodeType.SLACK_CHANNEL_JOINED,
    label: "Channel Joined",
    description: "Triggers when a user joins a Slack channel.",
    icon: "/logos/slack.svg",
    requiresApp: AppProvider.SLACK,
  },
];

const discordTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.DISCORD_NEW_MESSAGE,
    label: "New Message",
    description: "Triggers when a new message is posted in a Discord channel.",
    icon: "/logos/discord.svg",
    requiresApp: AppProvider.DISCORD,
  },
  {
    type: NodeType.DISCORD_NEW_REACTION,
    label: "New Reaction",
    description: "Triggers when a reaction is added to a Discord message.",
    icon: "/logos/discord.svg",
    requiresApp: AppProvider.DISCORD,
  },
  {
    type: NodeType.DISCORD_USER_JOINED,
    label: "User Joined",
    description: "Triggers when a user joins a Discord server.",
    icon: "/logos/discord.svg",
    requiresApp: AppProvider.DISCORD,
  },
];

const telegramTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.TELEGRAM_TRIGGER,
    label: "Telegram (new message)",
    description: "Runs whenever your Telegram bot receives a new message.",
    icon: "/logos/telegram.svg",
  },
  {
    type: NodeType.TELEGRAM_NEW_MESSAGE,
    label: "New Message",
    description: "Triggers when your Telegram bot receives a message.",
    icon: "/logos/telegram.svg",
  },
  {
    type: NodeType.TELEGRAM_COMMAND_RECEIVED,
    label: "Command Received",
    description: "Triggers when a Telegram bot command is received.",
    icon: "/logos/telegram.svg",
  },
];

// CRM Triggers
const clientTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.CLIENT_CREATED_TRIGGER,
    label: "Client Created",
    description: "Triggers when a new client is created in your CRM.",
    icon: CreateClientIcon,
  },
  {
    type: NodeType.CLIENT_UPDATED_TRIGGER,
    label: "Client Updated",
    description: "Triggers when any client field is updated.",
    icon: UpdateClientIcon,
  },
  {
    type: NodeType.CLIENT_FIELD_CHANGED_TRIGGER,
    label: "Client Field Changed",
    description: "Triggers when a specific client field changes value.",
    icon: ClientFieldChangedIcon,
  },
  {
    type: NodeType.CLIENT_DELETED_TRIGGER,
    label: "Client Deleted",
    description: "Triggers when a client is deleted from your CRM.",
    icon: ClientDeletedIcon,
  },
  {
    type: NodeType.CLIENT_TYPE_CHANGED_TRIGGER,
    label: "Client Type Changed",
    description: "Triggers when a client's type is changed.",
    icon: ClientTypeChangedIcon,
  },
  {
    type: NodeType.CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER,
    label: "Client Lifecycle Stage Changed",
    description: "Triggers when a client moves to a different lifecycle stage.",
    icon: ClientLifecycleStageChangedIcon,
  },
];

const dealTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.DEAL_CREATED_TRIGGER,
    label: "Deal Created",
    description: "Triggers when a new deal is created.",
    icon: CreateDealIcon,
  },
  {
    type: NodeType.DEAL_UPDATED_TRIGGER,
    label: "Deal Updated",
    description: "Triggers when a deal is updated.",
    icon: DealEditIcon,
  },
  {
    type: NodeType.DEAL_DELETED_TRIGGER,
    label: "Deal Deleted",
    description: "Triggers when a deal is deleted.",
    icon: BanknoteXIcon,
  },
  {
    type: NodeType.DEAL_STAGE_CHANGED_TRIGGER,
    label: "Deal Stage Changed",
    description: "Triggers when a deal moves to a different stage.",
    icon: MoveDealIcon,
  },
];

const appointmentTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.APPOINTMENT_CREATED_TRIGGER,
    label: "Appointment Created",
    description: "Triggers when a new appointment is created.",
    icon: CalendarAddIcon,
  },
  {
    type: NodeType.APPOINTMENT_CANCELLED_TRIGGER,
    label: "Appointment Cancelled",
    description: "Triggers when an appointment is cancelled.",
    icon: CalendarCancelIcon,
  },
];

// Stripe Triggers
const stripeTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.STRIPE_PAYMENT_SUCCEEDED,
    label: "Payment Succeeded",
    description: "Triggers when a Stripe payment succeeds.",
    icon: "/logos/stripe.svg",
  },
  {
    type: NodeType.STRIPE_PAYMENT_FAILED,
    label: "Payment Failed",
    description: "Triggers when a Stripe payment fails.",
    icon: "/logos/stripe.svg",
  },
  {
    type: NodeType.STRIPE_SUBSCRIPTION_CREATED,
    label: "Subscription Created",
    description: "Triggers when a new Stripe subscription is created.",
    icon: "/logos/stripe.svg",
  },
  {
    type: NodeType.STRIPE_SUBSCRIPTION_UPDATED,
    label: "Subscription Updated",
    description: "Triggers when a Stripe subscription is updated.",
    icon: "/logos/stripe.svg",
  },
  {
    type: NodeType.STRIPE_SUBSCRIPTION_CANCELLED,
    label: "Subscription Cancelled",
    description: "Triggers when a Stripe subscription is cancelled.",
    icon: "/logos/stripe.svg",
  },
];

// ========== EXECUTIONS ==========

// Google Executions - Organized by subcategory
const googleCalendarExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.GOOGLE_CALENDAR_CREATE_EVENT,
    label: "Create Event",
    description: "Create a new event on your Google Calendar.",
    icon: "/logos/googlecalendar.svg",
    requiresApp: AppProvider.GOOGLE_CALENDAR,
  },
  {
    type: NodeType.GOOGLE_CALENDAR_UPDATE_EVENT,
    label: "Update Event",
    description: "Update an existing event on your Google Calendar.",
    icon: "/logos/googlecalendar.svg",
    requiresApp: AppProvider.GOOGLE_CALENDAR,
  },
  {
    type: NodeType.GOOGLE_CALENDAR_DELETE_EVENT,
    label: "Delete Event",
    description: "Delete an event from your Google Calendar.",
    icon: "/logos/googlecalendar.svg",
    requiresApp: AppProvider.GOOGLE_CALENDAR,
  },
  {
    type: NodeType.GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES,
    label: "Find Available Times",
    description: "Find available time slots in your Google Calendar.",
    icon: "/logos/googlecalendar.svg",
    requiresApp: AppProvider.GOOGLE_CALENDAR,
  },
];

const gmailExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.GMAIL_SEND_EMAIL,
    label: "Send Email",
    description: "Send an email via your Gmail account.",
    icon: "/logos/google.svg",
    requiresApp: AppProvider.GMAIL,
  },
  {
    type: NodeType.GMAIL_REPLY_TO_EMAIL,
    label: "Reply to Email",
    description: "Reply to an existing email thread.",
    icon: "/logos/google.svg",
    requiresApp: AppProvider.GMAIL,
  },
  {
    type: NodeType.GMAIL_SEARCH_EMAILS,
    label: "Search Emails",
    description: "Search for emails using Gmail search syntax.",
    icon: "/logos/google.svg",
    requiresApp: AppProvider.GMAIL,
  },
  {
    type: NodeType.GMAIL_ADD_LABEL,
    label: "Add Label",
    description: "Add a label to an email.",
    icon: "/logos/google.svg",
    requiresApp: AppProvider.GMAIL,
  },
];

const googleDriveExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.GOOGLE_DRIVE_UPLOAD_FILE,
    label: "Upload File",
    description: "Upload a file to Google Drive.",
    icon: "/logos/googledrive.svg",
    requiresApp: AppProvider.GOOGLE_DRIVE,
  },
  {
    type: NodeType.GOOGLE_DRIVE_DOWNLOAD_FILE,
    label: "Download File",
    description: "Download a file from Google Drive.",
    icon: "/logos/googledrive.svg",
    requiresApp: AppProvider.GOOGLE_DRIVE,
  },
  {
    type: NodeType.GOOGLE_DRIVE_MOVE_FILE,
    label: "Move File",
    description: "Move a file to another folder in Google Drive.",
    icon: "/logos/googledrive.svg",
    requiresApp: AppProvider.GOOGLE_DRIVE,
  },
  {
    type: NodeType.GOOGLE_DRIVE_DELETE_FILE,
    label: "Delete File",
    description: "Delete a file from Google Drive.",
    icon: "/logos/googledrive.svg",
    requiresApp: AppProvider.GOOGLE_DRIVE,
  },
  {
    type: NodeType.GOOGLE_DRIVE_CREATE_FOLDER,
    label: "Create Folder",
    description: "Create a new folder in Google Drive.",
    icon: "/logos/googledrive.svg",
    requiresApp: AppProvider.GOOGLE_DRIVE,
  },
];

const googleFormExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.GOOGLE_FORM_READ_RESPONSES,
    label: "Read Responses",
    description: "Read responses from a Google Form.",
    icon: "/logos/googleform.svg",
    requiresApp: AppProvider.GOOGLE_FORMS,
  },
  {
    type: NodeType.GOOGLE_FORM_CREATE_RESPONSE,
    label: "Create Response",
    description: "Submit a response to a Google Form.",
    icon: "/logos/googleform.svg",
    requiresApp: AppProvider.GOOGLE_FORMS,
  },
];

// All Google executions combined
const googleExecutionNodes: NodeTypeOption[] = [
  ...googleCalendarExecutionNodes,
  ...gmailExecutionNodes,
  ...googleDriveExecutionNodes,
  ...googleFormExecutionNodes,
];

// Microsoft Executions - Organized by subcategory
const outlookExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.OUTLOOK_SEND_EMAIL,
    label: "Send Email",
    description: "Send an email via Outlook.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.OUTLOOK_REPLY_TO_EMAIL,
    label: "Reply to Email",
    description: "Reply to an existing Outlook email.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.OUTLOOK_MOVE_EMAIL,
    label: "Move Email",
    description: "Move an email to a different folder.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.OUTLOOK_SEARCH_EMAILS,
    label: "Search Emails",
    description: "Search for emails in Outlook.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
];

const onedriveExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.ONEDRIVE_UPLOAD_FILE,
    label: "Upload File",
    description: "Upload a file to OneDrive.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.ONEDRIVE_DOWNLOAD_FILE,
    label: "Download File",
    description: "Download a file from OneDrive.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.ONEDRIVE_MOVE_FILE,
    label: "Move File",
    description: "Move a file in OneDrive.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.ONEDRIVE_DELETE_FILE,
    label: "Delete File",
    description: "Delete a file from OneDrive.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
];

const outlookCalendarExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.OUTLOOK_CALENDAR_CREATE_EVENT,
    label: "Create Event",
    description: "Create a new event in Outlook Calendar.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.OUTLOOK_CALENDAR_UPDATE_EVENT,
    label: "Update Event",
    description: "Update an existing Outlook Calendar event.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
  {
    type: NodeType.OUTLOOK_CALENDAR_DELETE_EVENT,
    label: "Delete Event",
    description: "Delete an event from Outlook Calendar.",
    icon: "/logos/microsoft.svg",
    requiresApp: AppProvider.MICROSOFT,
  },
];

// All Microsoft executions combined
const microsoftExecutionNodes: NodeTypeOption[] = [
  ...outlookExecutionNodes,
  ...onedriveExecutionNodes,
  ...outlookCalendarExecutionNodes,
];

// Social/Communication Executions
const slackExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.SLACK_SEND_MESSAGE,
    label: "Send Message",
    description: "Send a message to a Slack channel.",
    icon: "/logos/slack.svg",
    requiresApp: AppProvider.SLACK,
  },
  {
    type: NodeType.SLACK_UPDATE_MESSAGE,
    label: "Update Message",
    description: "Update an existing Slack message.",
    icon: "/logos/slack.svg",
    requiresApp: AppProvider.SLACK,
  },
  {
    type: NodeType.SLACK_SEND_DM,
    label: "Send Direct Message",
    description: "Send a direct message to a Slack user.",
    icon: "/logos/slack.svg",
    requiresApp: AppProvider.SLACK,
  },
  {
    type: NodeType.SLACK_UPLOAD_FILE,
    label: "Upload File",
    description: "Upload a file to Slack.",
    icon: "/logos/slack.svg",
    requiresApp: AppProvider.SLACK,
  },
];

const discordExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.DISCORD_SEND_MESSAGE,
    label: "Send Message",
    description: "Send a message to a Discord channel.",
    icon: "/logos/discord.svg",
    requiresApp: AppProvider.DISCORD,
  },
  {
    type: NodeType.DISCORD_EDIT_MESSAGE,
    label: "Edit Message",
    description: "Edit an existing Discord message.",
    icon: "/logos/discord.svg",
    requiresApp: AppProvider.DISCORD,
  },
  {
    type: NodeType.DISCORD_SEND_EMBED,
    label: "Send Embed",
    description: "Send an embed message to Discord.",
    icon: "/logos/discord.svg",
    requiresApp: AppProvider.DISCORD,
  },
  {
    type: NodeType.DISCORD_SEND_DM,
    label: "Send Direct Message",
    description: "Send a direct message to a Discord user.",
    icon: "/logos/discord.svg",
    requiresApp: AppProvider.DISCORD,
  },
];

const telegramExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.TELEGRAM_SEND_MESSAGE,
    label: "Send Message",
    description: "Send a message via your Telegram bot.",
    icon: "/logos/telegram.svg",
  },
  {
    type: NodeType.TELEGRAM_SEND_PHOTO,
    label: "Send Photo",
    description: "Send a photo via your Telegram bot.",
    icon: "/logos/telegram.svg",
  },
  {
    type: NodeType.TELEGRAM_SEND_DOCUMENT,
    label: "Send Document",
    description: "Send a document via your Telegram bot.",
    icon: "/logos/telegram.svg",
  },
];

// CRM Executions
const clientExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.CREATE_CLIENT,
    label: "Create Client",
    description: "Create a new client in your CRM.",
    icon: CreateClientIcon,
  },
  {
    type: NodeType.UPDATE_CLIENT,
    label: "Update Client",
    description: "Update an existing client in your CRM.",
    icon: UpdateClientIcon,
  },
  {
    type: NodeType.DELETE_CLIENT,
    label: "Delete Client",
    description: "Delete a client from your CRM.",
    icon: ClientDeletedIcon,
  },
  {
    type: NodeType.FIND_CLIENTS,
    label: "Find Clients",
    description: "Search and filter clients in your CRM.",
    icon: FindClientsIcon,
  },
  {
    type: NodeType.ADD_TAG_TO_CLIENT,
    label: "Add Tag to Client",
    description: "Add a tag to a client.",
    icon: TagIcon,
  },
  {
    type: NodeType.REMOVE_TAG_FROM_CLIENT,
    label: "Remove Tag from Client",
    description: "Remove a tag from a client.",
    icon: TagIcon,
  },
];

const dealExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.CREATE_DEAL,
    label: "Create deal",
    description: "Create a new deal in your CRM pipeline.",
    icon: CreateDealIcon,
  },
  {
    type: NodeType.UPDATE_DEAL,
    label: "Update Deal",
    description: "Update an existing deal in your CRM.",
    icon: DealEditIcon,
  },
  {
    type: NodeType.DELETE_DEAL,
    label: "Delete Deal",
    description: "Delete a deal from your CRM.",
    icon: BanknoteXIcon,
  },
  {
    type: NodeType.MOVE_DEAL_STAGE,
    label: "Move Deal Stage",
    description: "Move a deal to a different pipeline stage.",
    icon: MoveDealIcon,
  },
  {
    type: NodeType.ADD_DEAL_NOTE,
    label: "Add Deal Note",
    description: "Add a note to a deal.",
    icon: NoteIcon,
  },
];

const pipelineExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.UPDATE_PIPELINE,
    label: "Update Pipeline",
    description: "Update pipeline configuration.",
    icon: "/logos/move-right.svg",
  },
];

const appointmentExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.SCHEDULE_APPOINTMENT,
    label: "Schedule Appointment",
    description: "Create a new appointment booking.",
    icon: CalendarAddIcon,
  },
  {
    type: NodeType.UPDATE_APPOINTMENT,
    label: "Update Appointment",
    description: "Update an existing appointment.",
    icon: CalendarEditIcon,
  },
  {
    type: NodeType.CANCEL_APPOINTMENT,
    label: "Cancel Appointment",
    description: "Cancel an appointment.",
    icon: CalendarCancelIcon,
  },
];

const studioTriggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.CLIENT_CREATED_TRIGGER,
    label: "New client added",
    description: "Runs when a new non-lead CRM member is added.",
    icon: UserCheck,
    defaultData: {
      clientTypeFilter: "CLIENT",
      variableName: "newClient",
    },
  },
  {
    type: NodeType.CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER,
    label: "Client transitioned to lifecycle stage",
    description:
      "Runs when a client moves from or into selected lifecycle stages.",
    icon: UserCheck,
    defaultData: {
      variableName: "clientStageChange",
    },
  },
  {
    type: NodeType.CLIENT_CREATED_TRIGGER,
    label: "New lead added",
    description: "Runs when a new lead is added.",
    icon: Users,
    defaultData: {
      clientTypeFilter: "LEAD",
      variableName: "newLead",
    },
  },
  {
    type: NodeType.FORM_SUBMITTED_TRIGGER,
    label: "Form submitted",
    description: "Runs when an Aurea published or builder form is submitted.",
    icon: FileCheck2,
  },
  {
    type: NodeType.FORM_SUBMITTED_TRIGGER,
    label: "Subscribed to newsletter",
    description:
      "Runs when a member submits the selected newsletter signup form.",
    icon: Mail,
    defaultData: {
      intent: "NEWSLETTER",
      formId: null,
      variableName: "newsletterSubscription",
    },
  },
  {
    type: NodeType.PRICING_OPTION_PURCHASED_TRIGGER,
    label: "Client purchased pricing option",
    description:
      "Runs after a successful checkout for configured pricing options.",
    icon: ShoppingBag,
  },
  {
    type: NodeType.CLIENT_INACTIVITY_TRIGGER,
    label: "No recent bookings",
    description:
      "Runs after a client has made no class bookings for a chosen period.",
    icon: TimerOff,
    defaultData: {
      days: 30,
      activityDimensions: ["CLASS_BOOKING"],
      variableName: "bookingInactivity",
    },
  },
  {
    type: NodeType.CLIENT_INACTIVITY_TRIGGER,
    label: "No recent purchases",
    description:
      "Runs after a client has made no successful purchases for a chosen period.",
    icon: TimerOff,
    defaultData: {
      days: 30,
      activityDimensions: ["SUCCESSFUL_PAYMENT"],
      variableName: "purchaseInactivity",
    },
  },
  {
    type: NodeType.CLIENT_INACTIVITY_TRIGGER,
    label: "No recent purchases or bookings",
    description:
      "Runs when neither a class booking nor a successful purchase is recent.",
    icon: TimerOff,
    defaultData: {
      days: 30,
      activityDimensions: ["CLASS_BOOKING", "SUCCESSFUL_PAYMENT"],
      variableName: "clientInactivity",
    },
  },
  {
    type: NodeType.BIRTHDAY_TRIGGER,
    label: "Upcoming birthday",
    description: "Runs before or on each member's birthday.",
    icon: Cake,
    defaultData: {
      daysBefore: 7,
      variableName: "birthday",
    },
  },
  {
    type: NodeType.CLASS_BOOKED_TRIGGER,
    label: "Class booked",
    description: "Runs when a member books a class.",
    icon: CalendarCheck,
    defaultData: {
      variableName: "bookedClass",
      firstBookingOnly: false,
      triggerTiming: "BOOKED",
    },
  },
  {
    type: NodeType.CLASS_BOOKED_TRIGGER,
    label: "One hour before class",
    description: "Runs one hour before a booked class begins.",
    icon: Bell,
    defaultData: {
      variableName: "upcomingClass",
      firstBookingOnly: false,
      triggerTiming: "ONE_HOUR_BEFORE",
    },
  },
  {
    type: NodeType.APPOINTMENT_CREATED_TRIGGER,
    label: "First appointment booked",
    description: "Runs when a client books their first appointment.",
    icon: CalendarCheck,
    defaultData: {
      variableName: "firstAppointment",
      firstAppointmentOnly: true,
    },
  },
  {
    type: NodeType.CLASS_BOOKED_TRIGGER,
    label: "First class booked",
    description: "Runs when a member books their first class.",
    icon: CalendarCheck,
    defaultData: {
      variableName: "firstClassBooking",
      firstBookingOnly: true,
      triggerTiming: "BOOKED",
    },
  },
  {
    type: NodeType.CLASS_CANCELLED_TRIGGER,
    label: "Class cancelled",
    description: "Runs when a class booking is cancelled.",
    icon: CalendarX,
  },
  {
    type: NodeType.MEMBER_CHECKED_IN_TRIGGER,
    label: "Checked into class",
    description: "Runs when a member checks in and includes visit count.",
    icon: UserCheck,
    defaultData: {
      variableName: "checkIn",
      firstCheckInOnly: false,
    },
  },
  {
    type: NodeType.MEMBER_CHECKED_IN_TRIGGER,
    label: "Checked into first class",
    description: "Runs only for a member's first class check-in.",
    icon: UserCheck,
    defaultData: {
      variableName: "firstCheckIn",
      firstCheckInOnly: true,
    },
  },
  {
    type: NodeType.MEMBER_NO_SHOW_TRIGGER,
    label: "Member no-show",
    description: "Runs when a member is marked as a no-show.",
    icon: UserMinus,
  },
  {
    type: NodeType.MEMBERSHIP_CREATED_TRIGGER,
    label: "Membership created",
    description: "Runs when a member signs up for a membership.",
    icon: Users,
  },
  {
    type: NodeType.MEMBERSHIP_EXPIRING_TRIGGER,
    label: "Subscription expiring",
    description: "Runs before an active subscription reaches its end date.",
    icon: Bell,
    defaultData: {
      membershipKind: "SUBSCRIPTION",
      daysBefore: 7,
      variableName: "expiringSubscription",
    },
  },
  {
    type: NodeType.MEMBERSHIP_EXPIRING_TRIGGER,
    label: "Package expiring soon",
    description: "Runs before a class package reaches its end date.",
    icon: Bell,
    defaultData: {
      membershipKind: "PACKAGE",
      daysBefore: 7,
      variableName: "expiringPackage",
    },
  },
  {
    type: NodeType.MEMBERSHIP_CANCELLED_TRIGGER,
    label: "Canceled subscription",
    description: "Runs when a membership is cancelled.",
    icon: UserMinus,
  },
  {
    type: NodeType.WAITLIST_SPOT_OPENED_TRIGGER,
    label: "Waitlist spot opened",
    description: "Runs when a waitlist spot becomes available.",
    icon: Bell,
  },
  {
    type: NodeType.INTRO_OFFER_REDEEMED_TRIGGER,
    label: "Intro offer redeemed",
    description: "Runs when a member redeems an intro offer.",
    icon: Gift,
  },
  {
    type: NodeType.INTRO_OFFER_COMPLETED_TRIGGER,
    label: "Intro offer completed",
    description: "Runs when a member uses the final class in an intro offer.",
    icon: Gift,
  },
  {
    type: NodeType.INTRO_OFFER_COMPLETED_TRIGGER,
    label: "Client used all pricing option credits",
    description:
      "Runs when a member uses the final credit in a class package.",
    icon: Gift,
    defaultData: {
      creditThreshold: 0,
      pricingOptionIds: [],
      pricingOptionNames: [],
      variableName: "pricingCreditsUsed",
    },
  },
  {
    type: NodeType.INTRO_OFFER_COMPLETED_TRIGGER,
    label: "Package credits running low",
    description:
      "Runs when a member's remaining class credits reach a chosen threshold.",
    icon: Gift,
    defaultData: {
      creditThreshold: 2,
      pricingOptionIds: [],
      pricingOptionNames: [],
      variableName: "pricingCreditsLow",
    },
  },
  {
    type: NodeType.REFERRAL_CONVERTED_TRIGGER,
    label: "Referral converted",
    description: "Runs when a referred member converts.",
    icon: Handshake,
  },
  {
    type: NodeType.MEMBER_CLASS_COUNT_TRIGGER,
    label: "Milestone reached",
    description: "Runs when a member reaches a configured attendance count.",
    icon: Trophy,
    defaultData: {
      targetCount: 10,
      variableName: "milestone",
    },
  },
  {
    type: NodeType.MEMBER_CLASS_COUNT_TRIGGER,
    label: "Class milestone at location",
    description: "Runs when a member reaches a configured visit count.",
    icon: Trophy,
  },
  {
    type: NodeType.CLIENT_TAG_ADDED_TRIGGER,
    label: "Client tag added",
    description: "Runs when a specific tag is added to a member.",
    icon: TagIcon,
  },
  {
    type: NodeType.CLIENT_TAG_REMOVED_TRIGGER,
    label: "Member tag removed",
    description: "Runs when a specific tag is removed from a member.",
    icon: TagIcon,
  },
  {
    type: NodeType.STUDIO_PAYMENT_SUCCEEDED_TRIGGER,
    label: "Studio payment succeeded",
    description: "Runs when a membership, POS, or gift card payment succeeds.",
    icon: CreditCard,
  },
  {
    type: NodeType.STUDIO_PAYMENT_SUCCEEDED_TRIGGER,
    label: "Subscription first payment succeeded",
    description:
      "Runs when the first successful payment for a membership is recorded.",
    icon: CreditCard,
    defaultData: {
      firstPaymentOnly: true,
      variableName: "subscriptionPayment",
    },
  },
  {
    type: NodeType.STUDIO_PAYMENT_FAILED_TRIGGER,
    label: "Studio payment failed",
    description: "Runs when a studio payment fails.",
    icon: CreditCard,
  },
];

const studioExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.STUDIO_CLASS_ACTION,
    label: "Attendance and waitlist action",
    description: "Check in, mark a no-show, or manage a class waitlist.",
    icon: CalendarCheck2,
  },
  {
    type: NodeType.CREATE_TASK,
    label: "Create task",
    description: "Create a tenant-scoped CRM follow-up task.",
    icon: ListTodo,
  },
  {
    type: NodeType.SEND_EMAIL,
    label: "Send email",
    description: "Queue a client email through the workspace provider.",
    icon: Mail,
  },
  {
    type: NodeType.SEND_CLASS_REMINDER,
    label: "Send class reminder",
    description: "Queue reminders for booked class attendees.",
    icon: Bell,
  },
  {
    type: NodeType.AWARD_LOYALTY_POINTS,
    label: "Award loyalty points",
    description: "Add loyalty points to a member balance.",
    icon: Trophy,
  },
  {
    type: NodeType.CALCULATE_CHURN_SCORE,
    label: "Calculate churn score",
    description: "Refresh a member churn prediction.",
    icon: HeartPulse,
  },
  {
    type: NodeType.SEND_SMS,
    label: "Send SMS",
    description: "Send an SMS through your configured provider.",
    icon: MessageSquare,
  },
  {
    type: NodeType.UPDATE_CLIENT,
    label: "Lifecycle stage",
    description: "Move a workflow member to a selected lifecycle stage.",
    icon: UserCheck,
    defaultData: {
      workflowAction: "LIFECYCLE_STAGE",
      variableName: "updatedClient",
    },
  },
];

type StudioNodeCategory = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  nodes: NodeTypeOption[];
};

const studioTriggerCategories: StudioNodeCategory[] = [
  studioCategory(
    "forms-leads",
    "Forms and leads",
    "Responses and new lead activity",
    FileCheck2,
    studioTriggerNodes,
    [NodeType.CLIENT_CREATED_TRIGGER, NodeType.FORM_SUBMITTED_TRIGGER],
  ),
  studioCategory(
    "classes-visits",
    "Classes and visits",
    "Bookings, attendance, waitlists, and milestones",
    CalendarCheck2,
    studioTriggerNodes,
    [
      NodeType.CLASS_BOOKED_TRIGGER,
      NodeType.CLASS_CANCELLED_TRIGGER,
      NodeType.MEMBER_CHECKED_IN_TRIGGER,
      NodeType.MEMBER_NO_SHOW_TRIGGER,
      NodeType.WAITLIST_SPOT_OPENED_TRIGGER,
      NodeType.MEMBER_CLASS_COUNT_TRIGGER,
      NodeType.APPOINTMENT_CREATED_TRIGGER,
    ],
  ),
  studioCategory(
    "purchases-memberships",
    "Purchases and memberships",
    "Pricing options, memberships, and payments",
    CreditCard,
    studioTriggerNodes,
    [
      NodeType.PRICING_OPTION_PURCHASED_TRIGGER,
      NodeType.MEMBERSHIP_CREATED_TRIGGER,
      NodeType.MEMBERSHIP_EXPIRING_TRIGGER,
      NodeType.MEMBERSHIP_CANCELLED_TRIGGER,
      NodeType.STUDIO_PAYMENT_SUCCEEDED_TRIGGER,
      NodeType.STUDIO_PAYMENT_FAILED_TRIGGER,
    ],
  ),
  studioCategory(
    "member-lifecycle",
    "Member lifecycle",
    "Retention, offers, referrals, tags, and birthdays",
    Users,
    studioTriggerNodes,
    [
      NodeType.CLIENT_INACTIVITY_TRIGGER,
      NodeType.BIRTHDAY_TRIGGER,
      NodeType.INTRO_OFFER_REDEEMED_TRIGGER,
      NodeType.INTRO_OFFER_COMPLETED_TRIGGER,
      NodeType.REFERRAL_CONVERTED_TRIGGER,
      NodeType.CLIENT_TAG_ADDED_TRIGGER,
      NodeType.CLIENT_TAG_REMOVED_TRIGGER,
      NodeType.CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER,
    ],
  ),
];

const studioExecutionCategories: StudioNodeCategory[] = [
  studioCategory(
    "attendance-waitlists",
    "Attendance and waitlists",
    "Check in, record no-shows, and manage waitlists",
    CalendarCheck2,
    studioExecutionNodes,
    [NodeType.STUDIO_CLASS_ACTION, NodeType.SEND_CLASS_REMINDER],
  ),
  studioCategory(
    "member-follow-up",
    "Member follow-up",
    "Send a message or create work for your team",
    MessageSquare,
    studioExecutionNodes,
    [
      NodeType.SEND_EMAIL,
      NodeType.SEND_SMS,
      NodeType.CREATE_TASK,
      NodeType.UPDATE_CLIENT,
    ],
  ),
  studioCategory(
    "retention-tools",
    "Retention tools",
    "Loyalty and churn actions",
    HeartPulse,
    studioExecutionNodes,
    [NodeType.AWARD_LOYALTY_POINTS, NodeType.CALCULATE_CHURN_SCORE],
  ),
];

function studioCategory(
  id: string,
  label: string,
  description: string,
  icon: React.ComponentType<{ className?: string }>,
  nodes: NodeTypeOption[],
  types: NodeType[],
): StudioNodeCategory {
  const selectedTypes = new Set(types);
  return {
    id,
    label,
    description,
    icon,
    nodes: nodes.filter((node) => selectedTypes.has(node.type)),
  };
}

// Stripe Executions
const stripeExecutionNodes: NodeTypeOption[] = [
  {
    type: NodeType.STRIPE_CREATE_CHECKOUT_SESSION,
    label: "Create Checkout Session",
    description: "Create a new Stripe checkout session.",
    icon: "/logos/stripe.svg",
  },
  {
    type: NodeType.STRIPE_CREATE_INVOICE,
    label: "Create Invoice",
    description: "Create a new Stripe invoice.",
    icon: "/logos/stripe.svg",
  },
  {
    type: NodeType.STRIPE_SEND_INVOICE,
    label: "Send Invoice",
    description: "Send a Stripe invoice to a customer.",
    icon: "/logos/stripe.svg",
  },
];

// AI Nodes
const aiNodes: NodeTypeOption[] = [
  {
    type: NodeType.GEMINI,
    label: "Gemini",
    description: "Use Google Gemini to generate text",
    icon: "/logos/gemini.svg",
  },
  {
    type: NodeType.GEMINI_GENERATE_TEXT,
    label: "Gemini: Generate Text",
    description: "Generate text using Google Gemini AI.",
    icon: SparkleIcon,
  },
  {
    type: NodeType.GEMINI_SUMMARISE,
    label: "Gemini: Summarise",
    description: "Summarise text using Google Gemini AI.",
    icon: FileTextIcon,
  },
  {
    type: NodeType.GEMINI_TRANSFORM,
    label: "Gemini: Transform",
    description: "Transform text using Google Gemini AI.",
    icon: WandIcon,
  },
  {
    type: NodeType.GEMINI_CLASSIFY,
    label: "Gemini: Classify",
    description: "Classify text into categories using Gemini AI.",
    icon: TagIcon,
  },
  {
    type: NodeType.ANTHROPIC,
    label: "Anthropic Claude",
    description: "Use Anthropic Claude for AI tasks.",
    icon: "/logos/anthropic.svg",
  },
  {
    type: NodeType.OPENAI,
    label: "OpenAI",
    description: "Use OpenAI for AI tasks.",
    icon: "/logos/openai.svg",
  },
];

// Logic/Utility Nodes
const logicNodes: NodeTypeOption[] = [
  {
    type: NodeType.IF_ELSE,
    label: "IF / ELSE",
    description: "Split workflow into two branches based on a condition.",
    icon: IfElseIcon,
  },
  {
    type: NodeType.SWITCH,
    label: "SWITCH",
    description:
      "Split workflow into multiple branches based on value matching.",
    icon: SwitchIcon,
  },
  {
    type: NodeType.LOOP,
    label: "LOOP",
    description: "Repeat actions for each item in an array or N times.",
    icon: LoopIcon,
  },
  {
    type: NodeType.SET_VARIABLE,
    label: "Set Variable",
    description: "Store or transform data for use in subsequent nodes.",
    icon: SetVariableIcon,
  },
  {
    type: NodeType.STOP_WORKFLOW,
    label: "Stop Workflow",
    description: "Immediately terminate workflow execution.",
    icon: StopWorkflowIcon,
  },
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Makes a HTTP request",
    icon: HttpRequestIcon,
  },
  {
    type: NodeType.WAIT,
    label: "Wait / Delay",
    description: "Pause workflow execution for a specified amount of time.",
    icon: "/logos/clock.svg",
  },
  {
    type: NodeType.EXECUTE_WORKFLOW,
    label: "Execute Workflow",
    description: "Execute another workflow.",
    icon: ExecuteIcon,
  },
];

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  isBundle?: boolean;
}

export const NodeSelector: React.FC<NodeSelectorProps> = ({
  open,
  onOpenChange,
  children,
  isBundle = false,
}) => {
  const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();
  const { data: connectedProviders } = useSuspenseAppProviders();
  const connectedProviderSet = React.useMemo(
    () => new Set(connectedProviders || []),
    [connectedProviders],
  );

  const [currentView, setCurrentView] = useState<string>("main");
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(["Nodes"]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hasTrigger, setHasTrigger] = useState(false);
  const selectingActions = hasTrigger || isBundle;

  const trpc = useTRPC();
  const { data: bundles = [] } = useQuery({
    ...trpc.workflows.listBundles.queryOptions(),
    enabled: open,
  });

  // Update hasTrigger state when the sheet opens or nodes change
  React.useEffect(() => {
    if (open) {
      const nodes = getNodes();
      const triggerExists = nodes.some((node) =>
        isWorkflowTriggerNodeType(node.type as NodeType),
      );
      setHasTrigger(triggerExists);
    }
  }, [open, getNodes]);

  const handleNodeSelect = useCallback(
    (selection: NodeTypeOption, bundleId?: string) => {
      if (!nodeTypeIsAvailable(selection.type)) {
        toast.error("This node is not available yet.");
        return;
      }

      // Check if trying to add a trigger node
      if (isWorkflowTriggerNodeType(selection.type)) {
        const nodes = getNodes();
        const existingTrigger = nodes.find((node) =>
          isWorkflowTriggerNodeType(node.type as NodeType),
        );

        if (existingTrigger) {
          toast.error(
            "Only one trigger is allowed per workflow. Please remove the existing trigger first.",
          );
          return;
        }
      }

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const flowPosition = screenToFlowPosition({
        x: centerX + (Math.random() - 0.5) * 200,
        y: centerY + (Math.random() - 0.5) * 200,
      });

      const newNode = {
        id: createId(),
        data: {
          ...getNodeDefaultData(selection.type),
          ...selection.defaultData,
          ...(bundleId ? { bundleWorkflowId: bundleId } : {}),
        },
        position: flowPosition,
        type: selection.type,
      };

      setNodes((nodes) => {
        // Remove INITIAL placeholder node if it exists
        const filteredNodes = nodes.filter(
          (node) => node.type !== NodeType.INITIAL,
        );
        return [...filteredNodes, newNode];
      });

      onOpenChange(false);
      setCurrentView("main");
      setBreadcrumbs(["Nodes"]);
      setSearchQuery("");
    },
    [setNodes, getNodes, onOpenChange, screenToFlowPosition],
  );

  const getIntegrationLabel = (provider?: AppProvider) => {
    switch (provider) {
      case AppProvider.GOOGLE_CALENDAR:
        return "Google Calendar";
      case AppProvider.GMAIL:
        return "Gmail";
      case AppProvider.GOOGLE_DRIVE:
        return "Google Drive";
      case AppProvider.GOOGLE_FORMS:
        return "Google Forms";
      case AppProvider.OUTLOOK:
        return "Outlook";
      case AppProvider.ONEDRIVE:
        return "OneDrive";
      case AppProvider.MICROSOFT:
        return "Microsoft 365";
      default:
        return "this integration";
    }
  };

  const renderNodeButton = (nodeType: NodeTypeOption) => {
    const Icon = nodeType.icon;
    const isIntegrationSatisfied =
      !nodeType.requiresApp || connectedProviderSet.has(nodeType.requiresApp);
    const isTrigger = isWorkflowTriggerNodeType(nodeType.type);
    const isTriggerDisabled = isTrigger && hasTrigger;
    const isNodeUnavailable = !nodeTypeIsAvailable(nodeType.type);
    if (isNodeUnavailable) return null;

    return (
      <Button
        key={`${nodeType.type}-${nodeType.label}`}
        className="h-max w-full justify-start rounded-lg border border-black/10 bg-background px-4 py-3 text-primary hover:bg-primary-foreground/40 hover:text-primary dark:border-white/10"
        onClick={() => handleNodeSelect(nodeType)}
        variant="ghost"
        disabled={!isIntegrationSatisfied || isTriggerDisabled}
      >
        <div className="flex w-full items-center gap-4 overflow-hidden">
          {typeof Icon === "string" ? (
            <Image
              src={Icon}
              alt={nodeType.label}
              width={20}
              height={20}
              className="size-5 object-contain rounded-sm mt-1"
            />
          ) : (
            <Icon className="size-5 text-primary " />
          )}

          <div className="flex flex-col items-start text-left gap-0.5 max-w-[220px]">
            <h1 className="font-medium text-sm">{nodeType.label}</h1>

            <p className="text-[11px] text-primary/60 font-normal w-full whitespace-normal wrap-break-word">
              {nodeType.description}
            </p>

            {!isIntegrationSatisfied && (
              <p className="text-[10px] text-amber-600 font-normal wrap-break-word">
                Connect {getIntegrationLabel(nodeType.requiresApp)} in Apps to
                use this node.
              </p>
            )}

            {isTriggerDisabled && (
              <p className="text-[10px] text-amber-600 font-normal wrap-break-word">
                A trigger already exists. Remove it to add a different one.
              </p>
            )}
          </div>
        </div>
      </Button>
    );
  };

  const renderMenuButton = (
    label: string,
    description: string,
    icon: string | React.ComponentType<{ className?: string }>,
    onClick: () => void,
  ) => {
    const Icon = icon;
    return (
      <Button
        className="h-max w-full justify-between rounded-lg border border-black/10 bg-background px-4 py-3 text-primary hover:bg-primary-foreground/40 hover:text-primary dark:border-white/10"
        onClick={onClick}
        variant="ghost"
      >
        <div className="flex w-full items-center gap-4 overflow-hidden">
          {typeof Icon === "string" ? (
            <Image
              src={Icon}
              alt={label}
              width={20}
              height={20}
              className="size-5 object-contain rounded-sm mt-1"
            />
          ) : (
            <Icon className="size-5 text-primary " />
          )}

          <div className="flex flex-col items-start text-left gap-0.5 flex-1">
            <h1 className="font-medium text-sm">{label}</h1>
            <p className="text-[11px] text-primary/60 font-normal">
              {description}
            </p>
          </div>

          <ChevronRight className="size-4 text-primary/50" />
        </div>
      </Button>
    );
  };

  const navigateTo = (view: string, breadcrumb: string) => {
    setCurrentView(view);
    setBreadcrumbs([...breadcrumbs, breadcrumb]);
  };

  const navigateBack = (index: number) => {
    if (index === 0) {
      setCurrentView("main");
      setBreadcrumbs(["Nodes"]);
      return;
    }

    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);

    // Derive view from breadcrumbs path
    const path = newBreadcrumbs
      .slice(1)
      .join("-")
      .toLowerCase()
      .replace(/ /g, "-");
    setCurrentView(path || "main");
  };

  // Filter nodes based on search query
  const filterNodes = (nodes: NodeTypeOption[]) => {
    const availableNodes = nodes.filter((node) =>
      nodeTypeIsAvailable(node.type),
    );
    if (!searchQuery.trim()) return availableNodes;
    const query = searchQuery.toLowerCase();
    return availableNodes.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query),
    );
  };

  // Get all nodes for search
  const allNodes = useMemo(() => {
    const nodes: NodeTypeOption[] = [];

    if (!hasTrigger && !isBundle) {
      // Show only triggers
      nodes.push(manualTriggerNode);
      nodes.push(...googleTriggerNodes);
      nodes.push(...microsoftTriggerNodes);
      nodes.push(...slackTriggerNodes);
      nodes.push(...discordTriggerNodes);
      nodes.push(...telegramTriggerNodes);
      nodes.push(...clientTriggerNodes);
      nodes.push(...dealTriggerNodes);
      nodes.push(...appointmentTriggerNodes);
      nodes.push(...studioTriggerNodes);
      nodes.push(...stripeTriggerNodes);
    } else {
      // Show only executions
      nodes.push(...googleExecutionNodes);
      nodes.push(...microsoftExecutionNodes);
      nodes.push(...slackExecutionNodes);
      nodes.push(...discordExecutionNodes);
      nodes.push(...telegramExecutionNodes);
      nodes.push(...clientExecutionNodes);
      nodes.push(...dealExecutionNodes);
      nodes.push(...pipelineExecutionNodes);
      nodes.push(...appointmentExecutionNodes);
      nodes.push(...studioExecutionNodes);
      nodes.push(...stripeExecutionNodes);
      nodes.push(...aiNodes);
      if (!isBundle) {
        nodes.push(...logicNodes);
      }
    }

    return nodes;
  }, [hasTrigger, isBundle]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const results = filterNodes(allNodes);
    return results.length > 0 ? results : [];
  }, [searchQuery, allNodes]);

  // Filter bundles
  const filteredBundles = useMemo(() => {
    if (!searchQuery.trim()) return bundles;
    const query = searchQuery.toLowerCase();
    return bundles.filter(
      (bundle) =>
        bundle.name.toLowerCase().includes(query) ||
        bundle.description?.toLowerCase().includes(query),
    );
  }, [bundles, searchQuery]);

  const renderContent = () => {
    // Search results
    if (searchQuery.trim()) {
      if (!searchResults || searchResults.length === 0) {
        return (
          <div className="px-2 py-6 flex items-center justify-center">
            <p className="text-xs text-primary">
              No results found for "{searchQuery}"
            </p>
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-2">
          {searchResults.map((node) => renderNodeButton(node))}
        </div>
      );
    }

    const activeStudioCategory = (
      selectingActions ? studioExecutionCategories : studioTriggerCategories
    ).find((category) => currentView === `studio-${category.id}`);
    if (activeStudioCategory) {
      return (
        <div className="flex flex-col gap-2">
          {filterNodes(activeStudioCategory.nodes).map((node) =>
            renderNodeButton(node),
          )}
        </div>
      );
    }

    // Main navigation
    switch (currentView) {
      case "main":
        return (
          <div className="flex flex-col gap-2">
            {!isBundle && !hasTrigger && renderNodeButton(manualTriggerNode)}

            {!isBundle &&
              renderMenuButton(
                "Google",
                hasTrigger
                  ? "Gmail, Calendar, Drive, Forms"
                  : "Google services (Triggers)",
                "/logos/google.svg",
                () => navigateTo("google", "Google"),
              )}

            {!isBundle &&
              renderMenuButton(
                "Microsoft",
                hasTrigger
                  ? "Outlook, OneDrive, Calendar"
                  : "Microsoft services (Triggers)",
                "/logos/microsoft.svg",
                () => navigateTo("microsoft", "Microsoft"),
              )}

            {hasTrigger &&
              renderMenuButton(
                "Social",
                "Slack, Discord, Telegram",
                "/logos/slack.svg",
                () => navigateTo("social", "Social"),
              )}

            {renderMenuButton(
              "CRM",
              hasTrigger
                ? "Clients, Deals, Appointments"
                : "Client & Deal Triggers",
              CreateClientIcon,
              () => navigateTo("crm", "CRM"),
            )}

            {renderMenuButton(
              "Studio",
              selectingActions
                ? "Attendance, follow-up, and studio operations"
                : "Forms, classes, purchases, and member lifecycle",
              UserCheck,
              () => navigateTo("studio", "Studio"),
            )}

            {hasTrigger &&
              renderMenuButton(
                "Stripe",
                "Payments & Subscriptions",
                "/logos/stripe.svg",
                () => navigateTo("stripe", "Stripe"),
              )}

            {hasTrigger &&
              renderMenuButton(
                "AI",
                "Gemini, Claude, OpenAI",
                SparkleIcon,
                () => navigateTo("ai", "AI"),
              )}

            {!isBundle &&
              hasTrigger &&
              renderMenuButton(
                "Logic & Utilities",
                "IF/ELSE, Switch, Loop, HTTP",
                IfElseIcon,
                () => navigateTo("logic-&-utilities", "Logic & Utilities"),
              )}

            {!isBundle &&
              hasTrigger &&
              renderMenuButton(
                "Bundle Workflows",
                "Reusable workflow bundles",
                IconImagineAi,
                () => navigateTo("bundle-workflows", "Bundle Workflows"),
              )}
          </div>
        );

      // Google views
      case "google":
        return (
          <div className="flex flex-col gap-2">
            {renderMenuButton(
              "Gmail",
              hasTrigger ? "Email actions" : "Email triggers",
              "/logos/google.svg",
              () => navigateTo("google-gmail", "Gmail"),
            )}
            {renderMenuButton(
              "Calendar",
              hasTrigger ? "Calendar actions" : "Calendar triggers",
              "/logos/googlecalendar.svg",
              () => navigateTo("google-calendar", "Calendar"),
            )}
            {renderMenuButton(
              "Drive",
              hasTrigger ? "Drive actions" : "Drive triggers",
              "/logos/googledrive.svg",
              () => navigateTo("google-drive", "Drive"),
            )}
            {renderMenuButton(
              "Forms",
              hasTrigger ? "Form actions" : "Form triggers",
              "/logos/googleform.svg",
              () => navigateTo("google-forms", "Forms"),
            )}
          </div>
        );

      case "google-gmail":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger ? gmailExecutionNodes : gmailTriggerNodes).map(
              (node) => renderNodeButton(node),
            )}
          </div>
        );

      case "google-calendar":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger
              ? googleCalendarExecutionNodes
              : googleCalendarTriggerNodes
            ).map((node) => renderNodeButton(node))}
          </div>
        );

      case "google-drive":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger
              ? googleDriveExecutionNodes
              : googleDriveTriggerNodes
            ).map((node) => renderNodeButton(node))}
          </div>
        );

      case "google-forms":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger
              ? googleFormExecutionNodes
              : googleFormTriggerNodes
            ).map((node) => renderNodeButton(node))}
          </div>
        );

      // Microsoft views
      case "microsoft":
        return (
          <div className="flex flex-col gap-2">
            {renderMenuButton(
              "Outlook",
              hasTrigger ? "Email actions" : "Email triggers",
              "/logos/microsoft.svg",
              () => navigateTo("microsoft-outlook", "Outlook"),
            )}
            {renderMenuButton(
              "OneDrive",
              hasTrigger ? "File actions" : "File triggers",
              "/logos/microsoft.svg",
              () => navigateTo("microsoft-onedrive", "OneDrive"),
            )}
            {renderMenuButton(
              "Calendar",
              hasTrigger ? "Calendar actions" : "Calendar triggers",
              "/logos/microsoft.svg",
              () => navigateTo("microsoft-calendar", "Calendar"),
            )}
          </div>
        );

      case "microsoft-outlook":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger ? outlookExecutionNodes : outlookTriggerNodes).map(
              (node) => renderNodeButton(node),
            )}
          </div>
        );

      case "microsoft-onedrive":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger ? onedriveExecutionNodes : onedriveTriggerNodes).map(
              (node) => renderNodeButton(node),
            )}
          </div>
        );

      case "microsoft-calendar":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger
              ? outlookCalendarExecutionNodes
              : outlookCalendarTriggerNodes
            ).map((node) => renderNodeButton(node))}
          </div>
        );

      // Social views
      case "social":
        return (
          <div className="flex flex-col gap-2">
            {renderMenuButton(
              "Slack",
              "Slack integrations",
              "/logos/slack.svg",
              () => navigateTo("social-slack", "Slack"),
            )}
            {renderMenuButton(
              "Discord",
              "Discord integrations",
              "/logos/discord.svg",
              () => navigateTo("social-discord", "Discord"),
            )}
            {renderMenuButton(
              "Telegram",
              "Telegram integrations",
              "/logos/telegram.svg",
              () => navigateTo("social-telegram", "Telegram"),
            )}
          </div>
        );

      case "social-slack":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger ? slackExecutionNodes : slackTriggerNodes).map(
              (node) => renderNodeButton(node),
            )}
          </div>
        );

      case "social-discord":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger ? discordExecutionNodes : discordTriggerNodes).map(
              (node) => renderNodeButton(node),
            )}
          </div>
        );

      case "social-telegram":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger ? telegramExecutionNodes : telegramTriggerNodes).map(
              (node) => renderNodeButton(node),
            )}
          </div>
        );

      // CRM views
      case "crm":
        return (
          <div className="flex flex-col gap-2">
            {renderMenuButton(
              "Clients",
              hasTrigger ? "Client actions" : "Client triggers",
              CreateClientIcon,
              () => navigateTo("crm-clients", "Clients"),
            )}
            {hasTrigger &&
              renderMenuButton("Deals", "Deal actions", CreateDealIcon, () =>
                navigateTo("crm-deals", "Deals"),
              )}
            {hasTrigger &&
              renderMenuButton(
                "Pipeline",
                "Pipeline actions",
                "/logos/move-right.svg",
                () => navigateTo("crm-pipeline", "Pipeline"),
              )}
            {renderMenuButton(
              "Appointments",
              hasTrigger ? "Appointment actions" : "Appointment triggers",
              CalendarAddIcon,
              () => navigateTo("crm-appointments", "Appointments"),
            )}
          </div>
        );

      case "crm-clients":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger ? clientExecutionNodes : clientTriggerNodes).map(
              (node) => renderNodeButton(node),
            )}
          </div>
        );

      case "crm-deals":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger ? dealExecutionNodes : dealTriggerNodes).map((node) =>
              renderNodeButton(node),
            )}
          </div>
        );

      case "crm-pipeline":
        return (
          <div className="flex flex-col gap-2">
            {pipelineExecutionNodes.map((node) => renderNodeButton(node))}
          </div>
        );

      case "crm-appointments":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger
              ? appointmentExecutionNodes
              : appointmentTriggerNodes
            ).map((node) => renderNodeButton(node))}
          </div>
        );

      case "studio":
        return (
          <div className="flex flex-col gap-2">
            {(selectingActions
              ? studioExecutionCategories
              : studioTriggerCategories
            )
              .filter((category) => filterNodes(category.nodes).length > 0)
              .map((category) => (
                <React.Fragment key={category.id}>
                  {renderMenuButton(
                    category.label,
                    category.description,
                    category.icon,
                    () => navigateTo(`studio-${category.id}`, category.label),
                  )}
                </React.Fragment>
              ))}
          </div>
        );

      // Stripe views
      case "stripe":
        return (
          <div className="flex flex-col gap-2">
            {(hasTrigger ? stripeExecutionNodes : stripeTriggerNodes).map(
              (node) => renderNodeButton(node),
            )}
          </div>
        );

      // AI views
      case "ai":
        return (
          <div className="flex flex-col gap-2">
            {aiNodes.map((node) => renderNodeButton(node))}
          </div>
        );

      // Logic views
      case "logic-&-utilities":
        return (
          <div className="flex flex-col gap-2">
            {logicNodes.map((node) => renderNodeButton(node))}
          </div>
        );

      // Bundles
      case "bundle-workflows":
        if (!bundles.length) {
          return (
            <p className="px-2 py-4 text-xs text-primary/75 text-center">
              No bundle workflows available. Create a workflow and mark it as a
              bundle to use it here.
            </p>
          );
        }
        return (
          <div className="flex flex-col gap-2">
            {filteredBundles.map((bundle) => (
              <Button
                key={`bundle-${bundle.id}`}
                className="w-full justify-start h-max py-5 px-8 bg-background text-primary hover:bg-primary-foreground/40 hover:text-primary rounded-sm border border-black/10"
                onClick={() =>
                  handleNodeSelect(
                    {
                      type: NodeType.BUNDLE_WORKFLOW,
                      label: bundle.name,
                      description: bundle.description || "",
                      icon: IconImagineAi,
                    },
                    bundle.id,
                  )
                }
                variant="ghost"
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  <IconImagineAi className="size-5 text-primary " />

                  <div className="flex flex-col items-start text-left gap-0.5 max-w-[220px]">
                    <h1 className="font-medium text-sm">{bundle.name}</h1>

                    <p className="text-[11px] text-primary/60 font-normal w-full whitespace-normal wrap-break-word">
                      {bundle.description || "Execute this bundle workflow"}
                    </p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setCurrentView("main");
          setBreadcrumbs(["Nodes"]);
          setSearchQuery("");
        }
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l border-black/10 bg-background pb-6 text-primary dark:border-white/10 sm:max-w-md"
      >
        <SheetHeader className="gap-0 px-5 pt-5">
          <SheetTitle className="text-primary font-medium">
            {!hasTrigger && !isBundle
              ? "Add trigger to workflow"
              : "Add action to workflow"}
          </SheetTitle>
          <SheetDescription className="text-primary/60">
            {isBundle
              ? "Choose from execution, social, or CRM nodes for your bundle"
              : "Browse through categories to find the node you need"}
          </SheetDescription>
        </SheetHeader>

        <Separator className="bg-black/10 dark:bg-white/10" />

        {/* Breadcrumb Navigation */}
        <div className="px-5 py-4 pb-3">
          <div className="flex items-center gap-2 text-xs">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={`breadcrumb-${index}-${crumb}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateBack(index)}
                  className={`h-auto p-0 text-xs ${
                    index === breadcrumbs.length - 1
                      ? "text-primary font-medium"
                      : "text-primary/60 hover:text-primary"
                  } transition-colors`}
                >
                  {crumb}
                </Button>
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="size-3 text-primary/60" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute z-10 left-3 top-1/2 -translate-y-1/2 size-3.5 text-primary!" />

            <Input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-black/10 text-primary placeholder:text-primary/60 focus:border-black/20"
            />
          </div>
        </div>

        <div className="px-5">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  );
};
