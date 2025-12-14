# Next Steps for Node Implementation

## ✅ Completed So Far (11 Nodes Fully Implemented)

### Infrastructure ✅
- Stub executor system for all 140+ nodes
- All nodes registered in executor registry
- Project builds successfully

### Fully Implemented Nodes ✅
1. **DEAL_CREATED_TRIGGER** - Complete (dialog, node, executor, channel)
2. **DEAL_UPDATED_TRIGGER** - Complete
3. **DEAL_DELETED_TRIGGER** - Complete
4. **DEAL_STAGE_CHANGED_TRIGGER** - Complete
5. **SLACK_SEND_MESSAGE** - Complete with OAuth API
6. **FIND_CONTACTS** - Complete

Plus ~30 existing nodes (CREATE_CONTACT, UPDATE_CONTACT, etc.)

**Total Progress: 37/140 nodes = 26.4%**

## 🚀 Quick Implementation Guide

To implement any remaining node, follow this pattern:

### 1. Create Node Files

```bash
# For execution nodes
mkdir -p src/features/nodes/executions/components/<node-name>
cd src/features/nodes/executions/components/<node-name>

# Create these 4 files:
touch dialog.tsx node.tsx executor.ts actions.ts
```

### 2. Dialog.tsx Template

```typescript
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore.",
    }),
  // Add your node-specific fields here
});

export type YourNodeFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: YourNodeFormValues) => void;
  defaultValues?: Partial<YourNodeFormValues>;
  variables: VariableItem[];
}

export const YourNodeDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "defaultVar",
      // ... other defaults
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "defaultVar",
        // ... reset logic
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
          <SheetTitle>Your node configuration</SheetTitle>
          <SheetDescription>
            Configure your node settings
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input placeholder="myVariable" {...field} />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    Access the result: <span className="text-primary font-medium">@{field.value || "myVariable"}</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Add more FormFields for your node */}

            <SheetFooter className="px-0 pb-4">
              <Button type="submit" className="w-max ml-auto" variant="gradient">
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
```

### 3. Node.tsx Template

```typescript
"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { YourNodeDialog, type YourNodeFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchYourNodeRealtimeToken } from "./actions";
import { YOUR_NODE_CHANNEL_NAME } from "@/inngest/channels/your-node";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { YourIcon } from "lucide-react"; // or import from "/logos/..."

type YourNodeData = Partial<YourNodeFormValues>;
type YourNodeType = Node<YourNodeData>;

export const YourNode: React.FC<NodeProps<YourNodeType>> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();

  const data = props.data || {};

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

  const description = data.someField ? `Config: ${data.someField}` : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: YOUR_NODE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchYourNodeRealtimeToken,
  });

  const handleSubmit = (values: YourNodeFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...values } }
          : node
      )
    );
  };

  return (
    <>
      <YourNodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon={YourIcon} // or "/logos/icon.svg"
        name="Your Node Name"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

YourNode.displayName = "YourNode";
```

### 4. Executor.ts Template

```typescript
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { yourNodeChannel } from "@/inngest/channels/your-node";
import { auth } from "@/lib/auth"; // For OAuth nodes
import { decode } from "html-entities";
import prisma from "@/lib/db"; // For database operations

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type YourNodeData = {
  variableName?: string;
  // ... your fields
};

export const yourNodeExecutor: NodeExecutor<YourNodeData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(yourNodeChannel().status({ nodeId, status: "loading" }));

  try {
    // Validation
    if (!data.requiredField) {
      await publish(yourNodeChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Your Node: Required field is missing");
    }

    // For OAuth nodes - get access token
    const tokenResponse = await step.run("get-token", async () => {
      return await auth.api.getAccessToken({
        body: {
          providerId: "slack", // or "google", "microsoft", "discord"
          userId,
        },
      });
    });
    const accessToken = tokenResponse?.accessToken;

    if (!accessToken) {
      await publish(yourNodeChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("OAuth not connected. Connect in Settings → Apps");
    }

    // Compile templates
    const compiledValue = decode(Handlebars.compile(data.fieldName)(context));

    // Do the work
    const result = await step.run("execute-action", async () => {
      // Call API or database
      return { success: true };
    });

    await publish(yourNodeChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? { [data.variableName]: result }
        : {}),
    };
  } catch (error) {
    await publish(yourNodeChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
```

### 5. Actions.ts Template

```typescript
"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function fetchYourNodeRealtimeToken() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  return session.session.id;
}
```

### 6. Create Inngest Channel

```typescript
// src/inngest/channels/your-node.ts
import { createChannel } from "inngest";

export const YOUR_NODE_CHANNEL_NAME = "your-node";

export type YourNodeStatus = {
  nodeId: string;
  status: "loading" | "success" | "error";
};

export const yourNodeChannel = () =>
  createChannel<{ status: YourNodeStatus }>({
    name: YOUR_NODE_CHANNEL_NAME,
  });
```

### 7. Register the Node

```typescript
// 1. In src/config/node-components.ts
import { YourNode } from "@/features/nodes/executions/components/your-node/node";

export const nodeComponents = {
  // ... existing nodes
  [NodeType.YOUR_NODE]: YourNode,
} as const satisfies NodeTypes;

// 2. In src/features/executions/lib/executor-registry.ts
import { yourNodeExecutor } from "@/features/nodes/executions/components/your-node/executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  // ... existing executors
  [NodeType.YOUR_NODE]: yourNodeExecutor,
};
```

## 📋 Priority Implementation Order

### Batch 1: Remaining CRM (4 nodes) - HIGHEST PRIORITY
1. ADD_TAG_TO_CONTACT
2. REMOVE_TAG_FROM_CONTACT
3. MOVE_DEAL_STAGE
4. ADD_DEAL_NOTE

### Batch 2: Gmail Executions (4 nodes)
1. GMAIL_SEND_EMAIL
2. GMAIL_REPLY_TO_EMAIL
3. GMAIL_SEARCH_EMAILS
4. GMAIL_ADD_LABEL

### Batch 3: Discord (4 nodes)
1. DISCORD_SEND_MESSAGE
2. DISCORD_EDIT_MESSAGE
3. DISCORD_SEND_EMBED
4. DISCORD_SEND_DM

### Batch 4: Remaining Slack (3 nodes)
1. SLACK_UPDATE_MESSAGE
2. SLACK_SEND_DM
3. SLACK_UPLOAD_FILE

### Batch 5: Google Calendar (4 nodes)
1. GOOGLE_CALENDAR_CREATE_EVENT
2. GOOGLE_CALENDAR_UPDATE_EVENT
3. GOOGLE_CALENDAR_DELETE_EVENT
4. GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES

### Batch 6: Google Drive (9 nodes)
- Triggers: FILE_CREATED, FILE_UPDATED, FILE_DELETED, FOLDER_CREATED
- Executions: UPLOAD_FILE, DOWNLOAD_FILE, MOVE_FILE, DELETE_FILE, CREATE_FOLDER

## 🔑 API Integration Reference

### Slack Web API
```typescript
const res = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ channel, text: message }),
});
```

### Discord API
```typescript
const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bot ${accessToken}`,
  },
  body: JSON.stringify({ content: message }),
});
```

### Gmail API
```typescript
const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ raw: base64EncodedEmail }),
});
```

### Google Calendar API
```typescript
const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ summary, start, end }),
});
```

## 📊 Current Status

**Implemented:** 37/140 (26.4%)
**With Stubs:** 103/140 (73.6%)
**Remaining:** 103 nodes

All nodes can be added to workflows. Unimplemented nodes show "Not yet implemented" error when executed.

## ✅ Testing

```bash
# Check TypeScript compilation
bunx tsc --noEmit

# Run development servers
npm run dev:all
```

Visit workflow builder and test adding nodes from the node selector.
