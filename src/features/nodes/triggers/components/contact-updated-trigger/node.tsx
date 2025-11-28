"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  ContactUpdatedTriggerDialog,
  type ContactUpdatedTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CONTACT_UPDATED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/contact-updated-trigger";
import { fetchContactUpdatedTriggerRealtimeToken } from "./actions";
import { IconPeopleEdit as UpdateContactIcon } from "central-icons/IconPeopleEdit";

type ContactUpdatedTriggerNodeData = Partial<ContactUpdatedTriggerFormValues>;
type ContactUpdatedTriggerNodeType = Node<ContactUpdatedTriggerNodeData>;

export const ContactUpdatedTriggerNode: React.FC<
  NodeProps<ContactUpdatedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CONTACT_UPDATED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchContactUpdatedTriggerRealtimeToken,
  });

  const data = props.data || {};

  const description =
    data.watchFields && data.watchFields.length > 0
      ? `Watching ${data.watchFields.length} field(s)`
      : "Triggers on any field change";

  const handleSubmit = (values: ContactUpdatedTriggerFormValues) => {
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
      <ContactUpdatedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "updatedContact",
          watchFields: data.watchFields || [],
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={UpdateContactIcon}
        name="Contact Updated"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
