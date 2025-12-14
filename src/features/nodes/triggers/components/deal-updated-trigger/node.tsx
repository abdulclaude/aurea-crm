"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseTriggerNode } from "../../base-trigger-node";
import {
  DealUpdatedTriggerDialog,
  type DealUpdatedTriggerFormValues,
} from "./dialog";
import { IconRewrite as DealEditIcon } from "central-icons/IconRewrite";

type DealUpdatedTriggerNodeData = Partial<DealUpdatedTriggerFormValues>;
type DealUpdatedTriggerNodeType = Node<DealUpdatedTriggerNodeData>;

export const DealUpdatedTriggerNode: React.FC<
  NodeProps<DealUpdatedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const data = props.data || {};

  const handleSubmit = (values: DealUpdatedTriggerFormValues) => {
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
      <DealUpdatedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "updatedDeal",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={DealEditIcon}
        name="Deal updated"
        description="Triggers when a deal is updated"
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

DealUpdatedTriggerNode.displayName = "DealUpdatedTriggerNode";
