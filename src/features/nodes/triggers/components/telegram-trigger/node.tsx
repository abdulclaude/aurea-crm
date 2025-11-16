"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { TELEGRAM_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/telegram-trigger";
import { fetchTelegramTriggerRealtimeToken } from "./realtime";
import { TelegramTriggerDialog } from "./dialog";

type TelegramTriggerNodeData = Partial<{
  variableName: string;
  credentialId: string;
  chatId?: string;
}>;

type TelegramTriggerNodeType = Node<TelegramTriggerNodeData>;

export const TelegramTriggerNode: React.FC<NodeProps<TelegramTriggerNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: TELEGRAM_TRIGGER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchTelegramTriggerRealtimeToken,
    });

    const data = props.data || {};

    const description = (() => {
      if (!data.credentialId) {
        return "Not configured";
      }
      if (data.chatId) {
        return `Watching chat ${data.chatId}`;
      }
      return "Watching all chats for this bot";
    })();

    const handleSubmit = (values: TelegramTriggerNodeData) => {
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
        <TelegramTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={{
            variableName: data.variableName || "telegramTrigger",
            credentialId: data.credentialId,
            chatId: data.chatId,
          }}
        />
        <BaseTriggerNode
          {...props}
          icon="/logos/telegram.svg"
          name="Telegram Trigger"
          description={description}
          status={nodeStatus}
          onSettings={handleOpen}
          onDoubleClick={handleOpen}
        />
      </>
    );
  });

TelegramTriggerNode.displayName = "TelegramTriggerNode";
