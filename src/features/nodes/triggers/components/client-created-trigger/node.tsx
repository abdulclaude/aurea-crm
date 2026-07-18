"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  ClientCreatedTriggerDialog,
} from "./dialog";
import type { ClientCreatedTriggerFormValues } from "./config";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CLIENT_CREATED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/client-created-trigger";
import { fetchClientCreatedTriggerRealtimeToken } from "./actions";
import { IconPeopleAdd as CreateClientIcon } from "central-icons/IconPeopleAdd";

type ClientCreatedTriggerNodeData = Partial<ClientCreatedTriggerFormValues>;
type ClientCreatedTriggerNodeType = Node<ClientCreatedTriggerNodeData>;

export const ClientCreatedTriggerNode: React.FC<
  NodeProps<ClientCreatedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CLIENT_CREATED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchClientCreatedTriggerRealtimeToken,
  });

  const data = props.data || {};

  const description =
    data.clientTypeFilter === "LEAD"
      ? "When a new lead is added"
      : data.clientTypeFilter === "CLIENT"
        ? "When a new client is added"
        : "When any CRM member is added";

  const handleSubmit = (values: ClientCreatedTriggerFormValues) => {
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
      <ClientCreatedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "newClient",
          clientTypeFilter: data.clientTypeFilter || "ANY",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={CreateClientIcon}
        name={
          data.clientTypeFilter === "LEAD"
            ? "New lead added"
            : data.clientTypeFilter === "CLIENT"
              ? "New client added"
              : "New CRM member"
        }
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
