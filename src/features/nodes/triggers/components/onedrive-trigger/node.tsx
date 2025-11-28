"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import { OneDriveTriggerDialog, type OneDriveTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { ONEDRIVE_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/onedrive-trigger";
import { fetchOneDriveTriggerRealtimeToken } from "./actions";

type OneDriveTriggerNodeData = Partial<OneDriveTriggerFormValues>;
type OneDriveTriggerNodeType = Node<OneDriveTriggerNodeData>;

export const OneDriveTriggerNode: React.FC<NodeProps<OneDriveTriggerNodeType>> = memo(
  (props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: ONEDRIVE_TRIGGER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchOneDriveTriggerRealtimeToken,
    });

    const data = props.data || {};

    const description = data.folderPath
      ? `Watching ${data.folderPath}`
      : "Not configured";

    const handleSubmit = (values: OneDriveTriggerFormValues) => {
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
        <OneDriveTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={{
            variableName: data.variableName || "oneDriveTrigger",
            folderPath: data.folderPath || "/",
            pollIntervalMinutes: data.pollIntervalMinutes ?? 5,
          }}
          variables={[]}
        />
        <BaseTriggerNode
          {...props}
          icon="/logos/microsoft.svg"
          name="OneDrive Trigger"
          description={description}
          status={nodeStatus}
          onSettings={handleOpen}
          onDoubleClick={handleOpen}
        />
      </>
    );
  }
);
