import { NodeType, type NodeType as NodeTypeValue } from "@/db/enums";
import {
  type ProviderAccountProvider,
  providerAccountProviderSchema,
} from "@/features/provider-accounts/contracts";
import { z } from "zod";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const GMAIL_READ_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GMAIL_MODIFY_SCOPE = "https://www.googleapis.com/auth/gmail.modify";
const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const GOOGLE_FORMS_RESPONSES_SCOPE =
  "https://www.googleapis.com/auth/forms.responses.readonly";
const GOOGLE_FORMS_BODY_SCOPE =
  "https://www.googleapis.com/auth/forms.body.readonly";

type WorkflowProviderBindingSpec = {
  provider: ProviderAccountProvider;
  displayName: string;
  requiredScopes: readonly string[];
};

export const WORKFLOW_PROVIDER_BINDING_REGISTRY = {
  [NodeType.GMAIL_EXECUTION]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Gmail",
    requiredScopes: [GMAIL_READ_SCOPE, GMAIL_SEND_SCOPE],
  },
  [NodeType.GMAIL_SEND_EMAIL]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Gmail: Send email",
    requiredScopes: [GMAIL_SEND_SCOPE],
  },
  [NodeType.GMAIL_REPLY_TO_EMAIL]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Gmail: Reply to email",
    requiredScopes: [GMAIL_READ_SCOPE, GMAIL_SEND_SCOPE],
  },
  [NodeType.GMAIL_SEARCH_EMAILS]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Gmail: Search emails",
    requiredScopes: [GMAIL_READ_SCOPE],
  },
  [NodeType.GMAIL_ADD_LABEL]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Gmail: Add label",
    requiredScopes: [GMAIL_MODIFY_SCOPE],
  },
  [NodeType.GMAIL_TRIGGER]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Gmail trigger",
    requiredScopes: [GMAIL_READ_SCOPE],
  },
  [NodeType.GOOGLE_CALENDAR_EXECUTION]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Google Calendar",
    requiredScopes: [GOOGLE_CALENDAR_SCOPE],
  },
  [NodeType.GOOGLE_CALENDAR_TRIGGER]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Google Calendar trigger",
    requiredScopes: [GOOGLE_CALENDAR_SCOPE],
  },
  [NodeType.GOOGLE_CALENDAR_CREATE_EVENT]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Google Calendar: Create event",
    requiredScopes: [GOOGLE_CALENDAR_SCOPE],
  },
  [NodeType.GOOGLE_CALENDAR_UPDATE_EVENT]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Google Calendar: Update event",
    requiredScopes: [GOOGLE_CALENDAR_SCOPE],
  },
  [NodeType.GOOGLE_CALENDAR_DELETE_EVENT]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Google Calendar: Delete event",
    requiredScopes: [GOOGLE_CALENDAR_SCOPE],
  },
  [NodeType.GOOGLE_DRIVE_CREATE_FOLDER]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Google Drive: Create folder",
    requiredScopes: [GOOGLE_DRIVE_FILE_SCOPE],
  },
  [NodeType.GOOGLE_DRIVE_DELETE_FILE]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Google Drive: Delete file",
    requiredScopes: [GOOGLE_DRIVE_SCOPE],
  },
  [NodeType.GOOGLE_DRIVE_DOWNLOAD_FILE]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Google Drive: Download file",
    requiredScopes: [GOOGLE_DRIVE_SCOPE],
  },
  [NodeType.GOOGLE_DRIVE_MOVE_FILE]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Google Drive: Move file",
    requiredScopes: [GOOGLE_DRIVE_SCOPE],
  },
  [NodeType.GOOGLE_DRIVE_UPLOAD_FILE]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Google Drive: Upload file",
    requiredScopes: [GOOGLE_DRIVE_FILE_SCOPE],
  },
  [NodeType.GOOGLE_FORM_READ_RESPONSES]: {
    provider: "GOOGLE_WORKSPACE",
    displayName: "Google Forms: Read responses",
    requiredScopes: [GOOGLE_FORMS_RESPONSES_SCOPE, GOOGLE_FORMS_BODY_SCOPE],
  },
  [NodeType.ONEDRIVE_EXECUTION]: {
    provider: "MICROSOFT_365",
    displayName: "OneDrive",
    requiredScopes: ["Files.ReadWrite.All"],
  },
  [NodeType.ONEDRIVE_TRIGGER]: {
    provider: "MICROSOFT_365",
    displayName: "OneDrive trigger",
    requiredScopes: ["Files.ReadWrite.All"],
  },
  [NodeType.OUTLOOK_EXECUTION]: {
    provider: "MICROSOFT_365",
    displayName: "Outlook",
    requiredScopes: ["Mail.Send"],
  },
  [NodeType.OUTLOOK_TRIGGER]: {
    provider: "MICROSOFT_365",
    displayName: "Outlook trigger",
    requiredScopes: ["Mail.ReadWrite"],
  },
  [NodeType.SLACK_SEND_MESSAGE]: {
    provider: "SLACK_OAUTH",
    displayName: "Slack: Send message",
    requiredScopes: ["chat:write"],
  },
} as const satisfies Partial<Record<NodeTypeValue, WorkflowProviderBindingSpec>>;

export type WorkflowProviderBindingNodeType =
  keyof typeof WORKFLOW_PROVIDER_BINDING_REGISTRY;

export function isWorkflowProviderBindingNodeType(
  value: unknown,
): value is WorkflowProviderBindingNodeType {
  return (
    typeof value === "string" && value in WORKFLOW_PROVIDER_BINDING_REGISTRY
  );
}

export const workflowProviderBindingNodeTypeSchema =
  z.custom<WorkflowProviderBindingNodeType>(isWorkflowProviderBindingNodeType, {
    message: "This workflow node does not support provider account binding.",
  });

export const requiredWorkflowProviderBindingSchema = z
  .object({
    providerAccountId: z.string().trim().min(1, "Select a provider account."),
  })
  .strict();

export function readWorkflowProviderAccountId(
  data: Record<string, unknown>,
): string | null {
  const value = data.providerAccountId;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getWorkflowProviderBindingSpec<
  TNodeType extends WorkflowProviderBindingNodeType,
>(
  nodeType: TNodeType,
): (typeof WORKFLOW_PROVIDER_BINDING_REGISTRY)[TNodeType] {
  const spec = WORKFLOW_PROVIDER_BINDING_REGISTRY[nodeType];
  providerAccountProviderSchema.parse(spec.provider);
  return spec;
}
