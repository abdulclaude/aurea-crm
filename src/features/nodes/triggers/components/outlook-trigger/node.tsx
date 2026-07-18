"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import { OutlookTriggerDialog, type OutlookTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { OUTLOOK_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/outlook-trigger";
import { fetchOutlookTriggerRealtimeToken } from "./actions";

type OutlookTriggerNodeData = Partial<OutlookTriggerFormValues> & {
  from?: string;
};
type OutlookTriggerNodeType = Node<OutlookTriggerNodeData>;

export const OutlookTriggerNode: React.FC<NodeProps<OutlookTriggerNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: OUTLOOK_TRIGGER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchOutlookTriggerRealtimeToken,
    });

    const data = props.data || {};

    const description = data.providerAccountId
      ? `Watching Inbox${data.subject ? ` (${data.subject})` : ""}`
      : "Not configured";

    const handleSubmit = (values: OutlookTriggerFormValues) => {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === props.id) {
            const nextData = { ...node.data } as Record<string, unknown>;
            delete nextData.from;
            return {
              ...node,
              data: {
                ...nextData,
                ...values,
              },
            };
          }
          return node;
        }),
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
            providerAccountId: data.providerAccountId || "",
            variableName: data.variableName || "outlookTrigger",
            folderName: "Inbox",
            subject: data.subject || "",
            sender: data.sender || data.from || "",
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
  });
