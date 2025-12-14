"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  ContactCreatedTriggerDialog,
  type ContactCreatedTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CONTACT_CREATED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/contact-created-trigger";
import { fetchContactCreatedTriggerRealtimeToken } from "./actions";
import { IconPeopleAdd as CreateContactIcon } from "central-icons/IconPeopleAdd";

type ContactCreatedTriggerNodeData = Partial<ContactCreatedTriggerFormValues>;
type ContactCreatedTriggerNodeType = Node<ContactCreatedTriggerNodeData>;

export const ContactCreatedTriggerNode: React.FC<
  NodeProps<ContactCreatedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CONTACT_CREATED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchContactCreatedTriggerRealtimeToken,
  });

  const data = props.data || {};

  const description = "Triggers when a contact is created";

  const handleSubmit = (values: ContactCreatedTriggerFormValues) => {
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
      <ContactCreatedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "newContact",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={CreateContactIcon}
        name="Contact created"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
