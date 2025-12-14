"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  DealCreatedTriggerDialog,
  type DealCreatedTriggerFormValues,
} from "./dialog";
import { IconCoinsAdd as CreateDealIcon } from "central-icons/IconCoinsAdd";

type DealCreatedTriggerNodeData = Partial<DealCreatedTriggerFormValues>;
type DealCreatedTriggerNodeType = Node<DealCreatedTriggerNodeData>;

export const DealCreatedTriggerNode: React.FC<
  NodeProps<DealCreatedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const data = props.data || {};

  const description = "Triggers when a deal is created";

  const handleSubmit = (values: DealCreatedTriggerFormValues) => {
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
      <DealCreatedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "newDeal",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={CreateDealIcon}
        name="Deal created"
        description={description}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});

DealCreatedTriggerNode.displayName = "DealCreatedTriggerNode";
