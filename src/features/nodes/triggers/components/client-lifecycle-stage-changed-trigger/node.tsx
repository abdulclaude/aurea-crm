"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  ClientLifecycleStageChangedTriggerDialog,
  type ClientLifecycleStageChangedTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/client-lifecycle-stage-changed-trigger";
import { fetchClientLifecycleStageChangedTriggerRealtimeToken } from "./actions";
import { IconLineChart3 as ClientLifecycleStageChangedIcon } from "central-icons/IconLineChart3";

type ClientLifecycleStageChangedTriggerNodeData =
  Partial<ClientLifecycleStageChangedTriggerFormValues>;
type ClientLifecycleStageChangedTriggerNodeType =
  Node<ClientLifecycleStageChangedTriggerNodeData>;

export const ClientLifecycleStageChangedTriggerNode: React.FC<
  NodeProps<ClientLifecycleStageChangedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchClientLifecycleStageChangedTriggerRealtimeToken,
  });

  const data = props.data || {};

  const description =
    data.fromStage && data.toStage
      ? `${data.fromStage} → ${data.toStage}`
      : data.fromStage
      ? `From ${data.fromStage}`
      : data.toStage
      ? `To ${data.toStage}`
      : "Any stage change";

  const handleSubmit = (
    values: ClientLifecycleStageChangedTriggerFormValues
  ) => {
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
      <ClientLifecycleStageChangedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "clientStageChange",
          fromStage: data.fromStage || "",
          toStage: data.toStage || "",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={ClientLifecycleStageChangedIcon}
        name="Client Lifecycle Stage Changed"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
