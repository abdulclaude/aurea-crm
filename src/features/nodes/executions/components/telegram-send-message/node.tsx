"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { TelegramSendMessageDialog, type TelegramSendMessageFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchTelegramSendMessageRealtimeToken } from "./actions";
import { TELEGRAM_SEND_MESSAGE_CHANNEL_NAME } from "@/inngest/channels/telegram-send-message";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/telegram.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type TelegramSendMessageNodeData = TelegramSendMessageFormValues;

type TelegramSendMessageNodeType = Node<TelegramSendMessageNodeData>;

export const TelegramSendMessageNode: React.FC<NodeProps<TelegramSendMessageNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as TelegramSendMessageNodeData) || nodeData;
    }, [dialogOpen, getNodes, props.id, nodeData]);

    const variables = useMemo(() => {
      if (!dialogOpen) return [];
      const nodes = getNodes();
      const edges = getEdges();
      return buildNodeContext(props.id, nodes, edges, {
        isBundle: workflowContext.isBundle,
        bundleInputs: workflowContext.bundleInputs,
        bundleWorkflowName: workflowContext.workflowName,
        parentWorkflowContext: workflowContext.parentWorkflowContext,
      });
    }, [props.id, getNodes, getEdges, dialogOpen, workflowContext]);

    const description = "Send a message via Telegram";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: TELEGRAM_SEND_MESSAGE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchTelegramSendMessageRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: TelegramSendMessageFormValues) => {
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

    return (
      <>
        <TelegramSendMessageDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/telegram.svg"
          name="Telegram: Send Message"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

TelegramSendMessageNode.displayName = "TelegramSendMessageNode";
