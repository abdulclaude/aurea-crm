"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  ContactTypeChangedTriggerDialog,
  type ContactTypeChangedTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CONTACT_TYPE_CHANGED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/contact-type-changed-trigger";
import { fetchContactTypeChangedTriggerRealtimeToken } from "./actions";
import { IconListSparkle as ContactTypeChangedIcon } from "central-icons/IconListSparkle";

type ContactTypeChangedTriggerNodeData =
  Partial<ContactTypeChangedTriggerFormValues>;
type ContactTypeChangedTriggerNodeType =
  Node<ContactTypeChangedTriggerNodeData>;

export const ContactTypeChangedTriggerNode: React.FC<
  NodeProps<ContactTypeChangedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CONTACT_TYPE_CHANGED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchContactTypeChangedTriggerRealtimeToken,
  });

  const data = props.data || {};

  const description =
    data.fromType && data.toType
      ? `${data.fromType} → ${data.toType}`
      : data.fromType
      ? `From ${data.fromType}`
      : data.toType
      ? `To ${data.toType}`
      : "Any type change";

  const handleSubmit = (values: ContactTypeChangedTriggerFormValues) => {
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
      <ContactTypeChangedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "contactTypeChange",
          fromType: data.fromType || "",
          toType: data.toType || "",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={ContactTypeChangedIcon}
        name="Contact Type Changed"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
