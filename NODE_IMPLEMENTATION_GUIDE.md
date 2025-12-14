# Node Implementation Guide

This guide explains how to implement the new node types that have been added to the schema.

## Overview

All **150+ new node types** have been added to:

- ✅ Prisma schema (`NodeType` enum)
- ✅ Node selector UI (categorized navigation)
- ✅ OAuth providers (Slack, Discord)
- ✅ Apps page (connection UI)

## Node Implementation Pattern

Each node requires 3-4 files in its respective directory:

### Directory Structure

**Triggers:** `src/features/nodes/triggers/components/<node-name>/`
**Executions:** `src/features/nodes/executions/components/<node-name>/`

Required files:

1. `node.tsx` - React component for the visual node
2. `dialog.tsx` - Configuration dialog
3. `executor.ts` - Server-side execution logic
4. `realtime.ts` - For real-time status updates

## Example: Slack Send Message Node

### 1. Create Directory

```
src/features/nodes/executions/components/slack-send-message/
├── node.tsx
├── dialog.tsx
└── executor.ts
```

### 2. node.tsx

```typescript
"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "../../base-execution-node";
import { SlackSendMessageDialog } from "./dialog";

type SlackSendMessageNodeData = Partial<{
  variableName: string;
  credentialId: string;
  channelId: string;
  message: string;
}>;

type SlackSendMessageNodeType = Node<SlackSendMessageNodeData>;

export const SlackSendMessageNode: React.FC<
  NodeProps<SlackSendMessageNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const data = props.data || {};

  const description = (() => {
    if (!data.credentialId || !data.channelId) {
      return "Not configured";
    }
    return `Send to channel ${data.channelId}`;
  })();

  const handleSubmit = (values: SlackSendMessageNodeData) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...values,
              },
            }
          : node
      )
    );
  };

  const handleOpen = () => setDialogOpen(true);

  return (
    <>
      <SlackSendMessageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "slackMessage",
          credentialId: data.credentialId,
          channelId: data.channelId,
          message: data.message,
        }}
        variables={[]}
      />
      <BaseExecutionNode
        {...props}
        icon="/logos/slack.svg"
        name="Slack - Send Message"
        description={description}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});

SlackSendMessageNode.displayName = "SlackSendMessageNode";
```

### 3. dialog.tsx

```typescript
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CredentialSelect } from "@/features/credentials/components/credential-select";

const schema = z.object({
  variableName: z.string().min(1, "Variable name required"),
  credentialId: z.string().min(1, "Slack credential required"),
  channelId: z.string().min(1, "Channel ID required"),
  message: z.string().min(1, "Message required"),
});

type FormValues = z.infer<typeof schema>;

interface SlackSendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FormValues) => void;
  defaultValues: Partial<FormValues>;
  variables: string[];
}

export const SlackSendMessageDialog: React.FC<SlackSendMessageDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      variableName: defaultValues.variableName || "slackMessage",
      credentialId: defaultValues.credentialId || "",
      channelId: defaultValues.channelId || "",
      message: defaultValues.message || "",
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slack - Send Message</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="slackMessage" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slack Credential</FormLabel>
                  <FormControl>
                    <CredentialSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      credentialType="SLACK"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="channelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="C1234567890" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Hello from Aurea CRM!"
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">Save</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
```

### 4. executor.ts

```typescript
import type { NodeExecutor } from "@/features/executions/lib/types";

export type SlackSendMessageExecutorInput = {
  credentialId: string;
  channelId: string;
  message: string;
};

export const slackSendMessageExecutor: NodeExecutor<
  SlackSendMessageExecutorInput
> = async (context) => {
  const { credentialId, channelId, message } = context.node.data;

  if (!credentialId || !channelId || !message) {
    throw new Error("Missing required configuration");
  }

  // Get Slack credential
  const credential = await context.prisma.credential.findUnique({
    where: { id: credentialId },
  });

  if (!credential) {
    throw new Error("Slack credential not found");
  }

  // Decrypt the Slack token
  const slackToken = context.decrypt(credential.encryptedValue);

  // Send message to Slack
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${slackToken}`,
    },
    body: JSON.stringify({
      channel: channelId,
      text: message,
    }),
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error}`);
  }

  return {
    ...context,
    variables: {
      ...context.variables,
      [context.node.data.variableName || "slackMessage"]: {
        success: true,
        timestamp: result.ts,
        channel: channelId,
      },
    },
  };
};
```

### 5. Register the Executor

In `src/features/executions/lib/executor-registry.ts`:

```typescript
import { slackSendMessageExecutor } from "@/features/nodes/executions/components/slack-send-message/executor";

export const executorRegistry = {
  // ... existing executors
  [NodeType.SLACK_SEND_MESSAGE]: slackSendMessageExecutor,
};
```

### 6. Register the Node Component

In `src/features/nodes/registry.tsx`:

```typescript
import { SlackSendMessageNode } from "./executions/components/slack-send-message/node";

export const nodeTypes = {
  // ... existing nodes
  [NodeType.SLACK_SEND_MESSAGE]: SlackSendMessageNode,
} as const;
```

## Quick Implementation Checklist

For each new node type:

- [ ] Create directory in `triggers/components/` or `executions/components/`
- [ ] Create `node.tsx` (visual component)
- [ ] Create `dialog.tsx` (configuration UI)
- [ ] Create `executor.ts` (server logic)
- [ ] Create `realtime.ts` (if needed for live updates)
- [ ] Register executor in `executor-registry.ts`
- [ ] Register node component in `registry.tsx`
- [ ] Add Inngest channel (for triggers) in `src/inngest/channels/`
- [ ] Import channel in `src/inngest/functions.ts`

## Node Categories to Implement

### High Priority (Most Commonly Used)

1. **Slack nodes** (3 triggers + 4 executions)
2. **Discord nodes** (3 triggers + 4 executions)
3. **Gmail execution nodes** (4 actions)
4. **Stripe nodes** (5 triggers + 4 executions)
5. **Deal triggers** (4 triggers)
6. **AI Gemini nodes** (4 execution types)

### Medium Priority

1. **Google Drive nodes** (4 triggers + 5 executions)
2. **Google Calendar detailed nodes** (3 triggers + 4 executions)
3. **Microsoft Outlook nodes** (3 triggers + 4 executions)
4. **OneDrive nodes** (3 triggers + 4 executions)
5. **Telegram detailed nodes** (2 triggers + 3 executions)

### Lower Priority (Advanced Use Cases)

1. **Google Forms execution nodes** (2 actions)
2. **Outlook Calendar nodes** (3 triggers + 3 executions)
3. **Advanced contact/deal actions** (Find, Add Tags, etc.)

## Testing Nodes

1. Start development servers:

   ```bash
   npm dev:all  # Starts Next.js + Inngest
   ```

2. Configure OAuth providers in `.env`:

   - Add client IDs and secrets
   - Set up webhook URLs

3. Test workflow:
   - Create new workflow
   - Add trigger node
   - Add execution nodes
   - Configure each node
   - Run workflow
   - Check Inngest UI at `http://localhost:8288`

## API Integration Examples

### Slack API

- Docs: https://api.slack.com/methods
- Token: Bearer token from OAuth
- Base URL: `https://slack.com/api/`

### Discord API

- Docs: https://discord.com/developers/docs/intro
- Token: Bot token from OAuth
- Base URL: `https://discord.com/api/v10/`

### Google Drive API

- Docs: https://developers.google.com/drive/api/v3/reference
- Token: OAuth access token
- Base URL: `https://www.googleapis.com/drive/v3/`

### Stripe API

- Docs: https://stripe.com/docs/api
- Token: Secret key from env
- Base URL: `https://api.stripe.com/v1/`

## Common Patterns

### Template Variables

Use `{{variableName}}` syntax in messages/content:

```typescript
const processedMessage = replaceTemplateVariables(message, context.variables);
```

### Error Handling

```typescript
try {
  // API call
} catch (error) {
  throw new Error(`Failed to send Slack message: ${error.message}`);
}
```

### Credential Management

```typescript
const credential = await context.prisma.credential.findUnique({
  where: { id: credentialId },
});
const token = context.decrypt(credential.encryptedValue);
```

## Resources

- [CLAUDE.md](./CLAUDE.md) - Project architecture guide
- [Prisma Schema](./prisma/schema.prisma) - Database schema
- [Node Selector](./src/components/node-selector.tsx) - UI implementation
- [Executor Registry](./src/features/executions/lib/executor-registry.ts) - Execution logic
- [Inngest Functions](./src/inngest/functions.ts) - Background job orchestration
