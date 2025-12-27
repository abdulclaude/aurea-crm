"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseTriggerNode } from "../../base-trigger-node";
import {
  DealStageChangedTriggerDialog,
  type DealStageChangedTriggerFormValues,
} from "./dialog";
import Image from "next/image";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { DEAL_STAGE_CHANGED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/deal-stage-changed-trigger";
import { fetchDealStageChangedTriggerRealtimeToken } from "./actions";

type DealStageChangedTriggerNodeData = Partial<DealStageChangedTriggerFormValues>;
type DealStageChangedTriggerNodeType = Node<DealStageChangedTriggerNodeData>;

export const DealStageChangedTriggerNode: React.FC<
  NodeProps<DealStageChangedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const data = props.data || {};

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: DEAL_STAGE_CHANGED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchDealStageChangedTriggerRealtimeToken,
  });

  const handleSubmit = (values: DealStageChangedTriggerFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...values,
              },
            }
          : node
      )
    );
  };

  return (
    <>
      <DealStageChangedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "dealStageChange",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon="/logos/move-right.svg"
        name="Deal stage changed"
        description="Triggers when deal moves to different stage"
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

DealStageChangedTriggerNode.displayName = "DealStageChangedTriggerNode";
