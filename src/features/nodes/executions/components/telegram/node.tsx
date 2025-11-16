"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  TelegramExecutionDialog,
  type TelegramExecutionFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { TELEGRAM_CHANNEL_NAME } from "@/inngest/channels/telegram";
import { fetchTelegramExecutionRealtimeToken } from "./realtime";

type TelegramNodeData = Partial<TelegramExecutionFormValues>;
type TelegramNodeType = Node<TelegramNodeData>;

export const TelegramExecutionNode: React.FC<NodeProps<TelegramNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const data = props.data || {};

    const description = data.chatId
      ? `Send to ${data.chatId}`
      : "Not configured";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: TELEGRAM_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchTelegramExecutionRealtimeToken,
    });

    const handleSubmit = (values: TelegramExecutionFormValues) => {
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
        <TelegramExecutionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={data}
        />
        <BaseExecutionNode
          {...props}
          icon="/logos/telegram.svg"
          name="Telegram"
          description={description}
          status={nodeStatus}
          onSettings={handleOpen}
          onDoubleClick={handleOpen}
        />
      </>
    );
  });

TelegramExecutionNode.displayName = "TelegramExecutionNode";
