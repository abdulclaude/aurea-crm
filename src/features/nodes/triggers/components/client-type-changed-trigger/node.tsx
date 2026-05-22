"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  ClientTypeChangedTriggerDialog,
  type ClientTypeChangedTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CLIENT_TYPE_CHANGED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/client-type-changed-trigger";
import { fetchClientTypeChangedTriggerRealtimeToken } from "./actions";
import { IconListSparkle as ClientTypeChangedIcon } from "central-icons/IconListSparkle";

type ClientTypeChangedTriggerNodeData =
  Partial<ClientTypeChangedTriggerFormValues>;
type ClientTypeChangedTriggerNodeType =
  Node<ClientTypeChangedTriggerNodeData>;

export const ClientTypeChangedTriggerNode: React.FC<
  NodeProps<ClientTypeChangedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CLIENT_TYPE_CHANGED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchClientTypeChangedTriggerRealtimeToken,
  });

  const data = props.data || {};

  const description =
    data.fromType && data.toType
      ? `${data.fromType} → ${data.toType}`
      : data.fromType
      ? `From ${data.fromType}`
      : data.toType
      ? `To ${data.toType}`
      : "Any type change";

  const handleSubmit = (values: ClientTypeChangedTriggerFormValues) => {
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
      <ClientTypeChangedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "clientTypeChange",
          fromType: data.fromType || "",
          toType: data.toType || "",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={ClientTypeChangedIcon}
        name="Client Type Changed"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
