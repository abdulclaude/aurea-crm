"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  ClientUpdatedTriggerDialog,
  type ClientUpdatedTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CLIENT_UPDATED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/client-updated-trigger";
import { fetchClientUpdatedTriggerRealtimeToken } from "./actions";
import { IconPeopleEdit as UpdateClientIcon } from "central-icons/IconPeopleEdit";

type ClientUpdatedTriggerNodeData = Partial<ClientUpdatedTriggerFormValues>;
type ClientUpdatedTriggerNodeType = Node<ClientUpdatedTriggerNodeData>;

export const ClientUpdatedTriggerNode: React.FC<
  NodeProps<ClientUpdatedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CLIENT_UPDATED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchClientUpdatedTriggerRealtimeToken,
  });

  const data = props.data || {};

  const description =
    data.watchFields && data.watchFields.length > 0
      ? `Watching ${data.watchFields.length} field(s)`
      : "Triggers on any field change";

  const handleSubmit = (values: ClientUpdatedTriggerFormValues) => {
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
      <ClientUpdatedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "updatedClient",
          watchFields: data.watchFields || [],
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={UpdateClientIcon}
        name="Client Updated"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
