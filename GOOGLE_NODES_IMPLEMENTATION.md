# Google Nodes Implementation Guide

## Status: GMAIL_SEND_EMAIL Fully Implemented ✅

Directory created: `src/features/nodes/executions/components/gmail-send-email/`
Files created:
- ✅ dialog.tsx
- ✅ node.tsx
- ✅ executor.ts
- ✅ actions.ts
- ✅ Inngest channel

**Ready to register in:**
1. `src/config/node-components.ts`
2. `src/features/executions/lib/executor-registry.ts`

## Directories Created (Ready for Implementation)

All directories created in `src/features/nodes/executions/components/`:

### Gmail (3 remaining)
- `gmail-reply-to-email/`
- `gmail-search-emails/`
- `gmail-add-label/`

### Google Calendar (4)
- `google-calendar-create-event/`
- `google-calendar-update-event/`
- `google-calendar-delete-event/`
- `google-calendar-find-available-times/`

### Google Drive (5)
- `google-drive-upload-file/`
- `google-drive-download-file/`
- `google-drive-move-file/`
- `google-drive-delete-file/`
- `google-drive-create-folder/`

### Google Forms (2)
- `google-form-read-responses/`
- `google-form-create-response/`

**Total: 14 nodes + 1 completed = 15 Google execution nodes**

## Quick Implementation Template

For each node, create these 4 files using the Gmail Send Email as a template:

### 1. dialog.tsx
- Import all UI components
- Define Zod schema with node-specific fields
- Create form with VariableInput for each field
- Export FormValues type

### 2. node.tsx
- Import dialog and BaseExecutionNode
- Use useNodeStatus hook with channel
- Build variables from context
- Create description from data
- Handle form submission

### 3. executor.ts
- Get OAuth token with `auth.api.getAccessToken()`
- Compile templates with Handlebars
- Call Google API with Bearer token
- Publish status updates
- Return context with variable data

### 4. actions.ts
- Export fetchRealtimeToken function
- Get session and return session.id

### 5. Create Inngest channel in `src/inngest/channels/<node-name>.ts`

## Gmail Nodes Quick Reference

### Gmail Reply To Email
**Fields:** messageId, replyBody
**API:** `POST /gmail/v1/users/me/messages/send` with `In-Reply-To` header

### Gmail Search Emails
**Fields:** query, maxResults
**API:** `GET /gmail/v1/users/me/messages?q={query}`

### Gmail Add Label
**Fields:** messageId, labelId
**API:** `POST /gmail/v1/users/me/messages/{messageId}/modify`

## Google Calendar Nodes Quick Reference

### Create Event
**Fields:** calendarId, summary, description, startDateTime, endDateTime, timezone
**API:** `POST /calendar/v3/calendars/{calendarId}/events`

### Update Event
**Fields:** calendarId, eventId, summary, description, startDateTime, endDateTime
**API:** `PUT /calendar/v3/calendars/{calendarId}/events/{eventId}`

### Delete Event
**Fields:** calendarId, eventId
**API:** `DELETE /calendar/v3/calendars/{calendarId}/events/{eventId}`

### Find Available Times
**Fields:** calendarId, startDate, endDate, duration
**API:** `POST /calendar/v3/freeBusy`

## Google Drive Nodes Quick Reference

### Upload File
**Fields:** fileName, mimeType, content (base64), parentFolderId
**API:** `POST /upload/drive/v3/files?uploadType=multipart`

### Download File
**Fields:** fileId
**API:** `GET /drive/v3/files/{fileId}?alt=media`

### Move File
**Fields:** fileId, newParentId
**API:** `PATCH /drive/v3/files/{fileId}?addParents={parentId}`

### Delete File
**Fields:** fileId
**API:** `DELETE /drive/v3/files/{fileId}`

### Create Folder
**Fields:** folderName, parentFolderId
**API:** `POST /drive/v3/files` with mimeType=`application/vnd.google-apps.folder`

## Google Forms Nodes Quick Reference

### Read Responses
**Fields:** formId, limit
**API:** `GET /forms/v1/forms/{formId}/responses`

### Create Response (Programmatic submission)
**Fields:** formId, answers (JSON)
**API:** Forms API doesn't support programmatic submissions - use formResponse instead

## OAuth Token Pattern (All Google Nodes)

```typescript
const tokenResponse = await step.run("get-google-token", async () => {
  return await auth.api.getAccessToken({
    body: {
      providerId: "google",
      userId,
    },
  });
});

const accessToken = tokenResponse?.accessToken;

if (!accessToken) {
  throw new NonRetriableError(
    "Google account not connected. Connect in Settings → Apps."
  );
}

// Then use in API call:
const response = await fetch(API_URL, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  ...
});
```

## Registration Checklist

After creating all node files:

1. Import in `src/config/node-components.ts`:
```typescript
import { GmailSendEmailNode } from "@/features/nodes/executions/components/gmail-send-email/node";
// ... repeat for all nodes

export const nodeComponents = {
  // ... existing
  [NodeType.GMAIL_SEND_EMAIL]: GmailSendEmailNode,
  // ... add all Google nodes
};
```

2. Import executors in `src/features/executions/lib/executor-registry.ts`:
```typescript
import { gmailSendEmailExecutor } from "@/features/nodes/executions/components/gmail-send-email/executor";
// ... repeat for all

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  // ... existing
  [NodeType.GMAIL_SEND_EMAIL]: gmailSendEmailExecutor,
  // ... replace all stub executors with real ones
};
```

## Next Steps

1. Use Gmail Send Email as template for remaining 3 Gmail nodes
2. Adapt pattern for Calendar nodes (similar API structure)
3. Implement Drive nodes (multipart upload for files)
4. Implement Forms nodes (read-only responses)
5. Register all in node-components.ts and executor-registry.ts
6. Test each node in workflow builder
