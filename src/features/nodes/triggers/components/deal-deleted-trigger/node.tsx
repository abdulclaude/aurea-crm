"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseTriggerNode } from "../../base-trigger-node";
import {
  DealDeletedTriggerDialog,
  type DealDeletedTriggerFormValues,
} from "./dialog";
import { BanknoteX as BanknoteXIcon } from "lucide-react";

type DealDeletedTriggerNodeData = Partial<DealDeletedTriggerFormValues>;
type DealDeletedTriggerNodeType = Node<DealDeletedTriggerNodeData>;

export const DealDeletedTriggerNode: React.FC<
  NodeProps<DealDeletedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const data = props.data || {};

  const handleSubmit = (values: DealDeletedTriggerFormValues) => {
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
      <DealDeletedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "deletedDeal",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={BanknoteXIcon}
        name="Deal deleted"
        description="Triggers when a deal is deleted"
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

DealDeletedTriggerNode.displayName = "DealDeletedTriggerNode";
