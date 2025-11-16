"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import { GmailTriggerDialog, type GmailTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { GMAIL_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/gmail-trigger";
import { fetchGmailTriggerRealtimeToken } from "./actions";

type GmailTriggerNodeData = Partial<GmailTriggerFormValues>;
type GmailTriggerNodeType = Node<GmailTriggerNodeData>;

export const GmailTriggerNode: React.FC<NodeProps<GmailTriggerNodeType>> = memo(
  (props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: GMAIL_TRIGGER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchGmailTriggerRealtimeToken,
    });

    const data = props.data || {};

    const description = data.labelId
      ? `Watching ${data.labelId}${data.query ? ` (${data.query})` : ""}`
      : "Not configured";

    const handleSubmit = (values: GmailTriggerFormValues) => {
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

    const handleOpen = () => setDialogOpen(true);

    return (
      <>
        <GmailTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={{
            variableName: data.variableName || "gmailTrigger",
            labelId: data.labelId || "INBOX",
            query: data.query || "",
            includeSpamTrash: data.includeSpamTrash ?? false,
            maxResults: data.maxResults ?? 5,
            pollIntervalMinutes: data.pollIntervalMinutes ?? 5,
          }}
        />
        <BaseTriggerNode
          {...props}
          icon="/logos/google.svg"
          name="Gmail Trigger"
          description={description}
          status={nodeStatus}
          onSettings={handleOpen}
          onDoubleClick={handleOpen}
        />
      </>
    );
  }
);
