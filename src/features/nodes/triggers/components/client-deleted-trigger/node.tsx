"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  ClientDeletedTriggerDialog,
  type ClientDeletedTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CLIENT_DELETED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/client-deleted-trigger";
import { fetchClientDeletedTriggerRealtimeToken } from "./actions";
import { UserMinusIcon } from "lucide-react";

type ClientDeletedTriggerNodeData = Partial<ClientDeletedTriggerFormValues>;
type ClientDeletedTriggerNodeType = Node<ClientDeletedTriggerNodeData>;

export const ClientDeletedTriggerNode: React.FC<
  NodeProps<ClientDeletedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CLIENT_DELETED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchClientDeletedTriggerRealtimeToken,
  });

  const data = props.data || {};

  const description = "Triggers when a client is deleted";

  const handleSubmit = (values: ClientDeletedTriggerFormValues) => {
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
      <ClientDeletedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "deletedClient",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={UserMinusIcon}
        name="Client Deleted"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
