"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import { WhatsAppTriggerDialog, type WhatsAppTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { WHATSAPP_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/whatsapp-trigger";
import { fetchWhatsAppTriggerRealtimeToken } from "./realtime";
import { useWhatsAppIntegrations } from "@/features/whatsapp/hooks/use-whatsapp-integrations";

type WhatsAppTriggerNodeData = Partial<WhatsAppTriggerFormValues>;
type WhatsAppTriggerNodeType = Node<WhatsAppTriggerNodeData>;

export const WhatsAppTriggerNode: React.FC<
  NodeProps<WhatsAppTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const { whatsappIntegrations } = useWhatsAppIntegrations();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: WHATSAPP_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWhatsAppTriggerRealtimeToken,
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
      return `Watching ${integration.metadata.displayPhoneNumber}`;
    }
    return "Watching connected WhatsApp number";
  })();

  const handleSubmit = (values: WhatsAppTriggerFormValues) => {
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
      <WhatsAppTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: data.variableName || "whatsappTrigger",
          integrationId: data.integrationId,
        }}
      />
      <BaseTriggerNode
        {...props}
        icon="/logos/whatsapp.svg"
        name="WhatsApp Trigger"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});

WhatsAppTriggerNode.displayName = "WhatsAppTriggerNode";

