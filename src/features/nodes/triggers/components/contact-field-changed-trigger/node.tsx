"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  ContactFieldChangedTriggerDialog,
  type ContactFieldChangedTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CONTACT_FIELD_CHANGED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/contact-field-changed-trigger";
import { fetchContactFieldChangedTriggerRealtimeToken } from "./actions";
import { IconMagicEdit as ContactFieldChangedIcon } from "central-icons/IconMagicEdit";

type ContactFieldChangedTriggerNodeData =
  Partial<ContactFieldChangedTriggerFormValues>;
type ContactFieldChangedTriggerNodeType =
  Node<ContactFieldChangedTriggerNodeData>;

export const ContactFieldChangedTriggerNode: React.FC<
  NodeProps<ContactFieldChangedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CONTACT_FIELD_CHANGED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchContactFieldChangedTriggerRealtimeToken,
  });

  const data = props.data || {};

  const description = data.fieldName
    ? `Watching field: ${data.fieldName}`
    : "Not configured";

  const handleSubmit = (values: ContactFieldChangedTriggerFormValues) => {
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
      <ContactFieldChangedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "contactChange",
          fieldName: data.fieldName || "",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={ContactFieldChangedIcon}
        name="Contact Field Changed"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
