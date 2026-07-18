"use client";

import { Cake } from "lucide-react";
import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import { BIRTHDAY_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/birthday-trigger";
import { fetchBirthdayTriggerRealtimeToken } from "./actions";
import {
  BirthdayTriggerDialog,
  type BirthdayTriggerFormValues,
} from "./dialog";

type BirthdayTriggerNodeData = Partial<BirthdayTriggerFormValues>;
type BirthdayTriggerNodeType = Node<BirthdayTriggerNodeData>;

export const BirthdayTriggerNode: React.FC<
  NodeProps<BirthdayTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const data = props.data || {};

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: BIRTHDAY_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchBirthdayTriggerRealtimeToken,
  });

  const handleSubmit = (values: BirthdayTriggerFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== props.id) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            ...values,
          },
        };
      }),
    );
  };

  const handleOpen = () => setDialogOpen(true);

  return (
    <>
      <BirthdayTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "birthday",
          daysBefore: data.daysBefore ?? 0,
        }}
      />
      <BaseTriggerNode
        {...props}
        icon={Cake}
        name="Upcoming birthday"
        description={
          data.daysBefore
            ? `${data.daysBefore} days before each member birthday`
            : "On each member birthday"
        }
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
