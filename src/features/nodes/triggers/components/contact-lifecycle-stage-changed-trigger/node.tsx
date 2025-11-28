"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  ContactLifecycleStageChangedTriggerDialog,
  type ContactLifecycleStageChangedTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/contact-lifecycle-stage-changed-trigger";
import { fetchContactLifecycleStageChangedTriggerRealtimeToken } from "./actions";
import { IconLineChart3 as ContactLifecycleStageChangedIcon } from "central-icons/IconLineChart3";

type ContactLifecycleStageChangedTriggerNodeData =
  Partial<ContactLifecycleStageChangedTriggerFormValues>;
type ContactLifecycleStageChangedTriggerNodeType =
  Node<ContactLifecycleStageChangedTriggerNodeData>;

export const ContactLifecycleStageChangedTriggerNode: React.FC<
  NodeProps<ContactLifecycleStageChangedTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchContactLifecycleStageChangedTriggerRealtimeToken,
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
    values: ContactLifecycleStageChangedTriggerFormValues
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
      <ContactLifecycleStageChangedTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "contactStageChange",
          fromStage: data.fromStage || "",
          toStage: data.toStage || "",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon={ContactLifecycleStageChangedIcon}
        name="Contact Lifecycle Stage Changed"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
