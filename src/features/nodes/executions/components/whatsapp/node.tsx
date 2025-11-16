"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  WhatsAppExecutionDialog,
  type WhatsAppExecutionFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { WHATSAPP_CHANNEL_NAME } from "@/inngest/channels/whatsapp";
import { fetchWhatsAppExecutionRealtimeToken } from "./realtime";
import { useWhatsAppIntegrations } from "@/features/whatsapp/hooks/use-whatsapp-integrations";

type WhatsAppExecutionNodeData = Partial<WhatsAppExecutionFormValues>;
type WhatsAppExecutionNodeType = Node<WhatsAppExecutionNodeData>;

export const WhatsAppExecutionNode: React.FC<
  NodeProps<WhatsAppExecutionNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const { whatsappIntegrations } = useWhatsAppIntegrations();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: WHATSAPP_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWhatsAppExecutionRealtimeToken,
  });

  const data = props.data || {};
  const integration = whatsappIntegrations.find(
    (item) => item.id === data.integrationId
  );

  const description = (() => {
    if (!data.integrationId) {
      return "Not configured";
    }
    if (integration?.metadata?.displayPhoneNumber) {
      return `Send from ${integration.metadata.displayPhoneNumber}`;
    }
    return "WhatsApp message";
  })();

  const handleSubmit = (values: WhatsAppExecutionFormValues) => {
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

  const handleOpen = () => setDialogOpen(true);

  return (
    <>
      <WhatsAppExecutionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "whatsappMessage",
          integrationId: data.integrationId,
          recipient: data.recipient,
          message: data.message,
          previewUrl: data.previewUrl,
        }}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/whatsapp.svg"
        name="WhatsApp Message"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});

WhatsAppExecutionNode.displayName = "WhatsAppExecutionNode";

