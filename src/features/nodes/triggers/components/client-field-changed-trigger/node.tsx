"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  ClientFieldChangedTriggerDialog,
  type ClientFieldChangedTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CLIENT_FIELD_CHANGED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/client-field-changed-trigger";
import { fetchClientFieldChangedTriggerRealtimeToken } from "./actions";
import { IconMagicEdit as ClientFieldChangedIcon } from "central-icons/IconMagicEdit";

type ClientFieldChangedTriggerNodeData =
  Partial<ClientFieldChangedTriggerFormValues>;
type ClientFieldChangedTriggerNodeType =
  Node<ClientFieldChangedTriggerNodeData>;

export const ClientFieldChangedTriggerNode: React.FC<
  NodeProps<ClientFieldChangedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CLIENT_FIELD_CHANGED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchClientFieldChangedTriggerRealtimeToken,
  });

  const data = props.data || {};

  const description = data.fieldName
    ? `Watching field: ${data.fieldName}`
    : "Not configured";

  const handleSubmit = (values: ClientFieldChangedTriggerFormValues) => {
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
      <ClientFieldChangedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "clientChange",
          fieldName: data.fieldName || "",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={ClientFieldChangedIcon}
        name="Client Field Changed"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
