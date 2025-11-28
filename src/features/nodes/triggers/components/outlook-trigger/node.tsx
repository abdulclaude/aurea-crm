"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import { OutlookTriggerDialog, type OutlookTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { OUTLOOK_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/outlook-trigger";
import { fetchOutlookTriggerRealtimeToken } from "./actions";

type OutlookTriggerNodeData = Partial<OutlookTriggerFormValues>;
type OutlookTriggerNodeType = Node<OutlookTriggerNodeData>;

export const OutlookTriggerNode: React.FC<NodeProps<OutlookTriggerNodeType>> = memo(
  (props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: OUTLOOK_TRIGGER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchOutlookTriggerRealtimeToken,
    });

    const data = props.data || {};

    const description = data.folderName
      ? `Watching ${data.folderName}${data.subject ? ` (${data.subject})` : ""}`
      : "Not configured";

    const handleSubmit = (values: OutlookTriggerFormValues) => {
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
        <OutlookTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={{
            variableName: data.variableName || "outlookTrigger",
            folderName: data.folderName || "Inbox",
            subject: data.subject || "",
            from: data.from || "",
            maxResults: data.maxResults ?? 5,
            pollIntervalMinutes: data.pollIntervalMinutes ?? 5,
          }}
          variables={[]}
        />
        <BaseTriggerNode
          {...props}
          icon="/logos/microsoft.svg"
          name="Outlook Trigger"
          description={description}
          status={nodeStatus}
          onSettings={handleOpen}
          onDoubleClick={handleOpen}
        />
      </>
    );
  }
);
