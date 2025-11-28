"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  TelegramExecutionDialog,
  type TelegramExecutionFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { TELEGRAM_CHANNEL_NAME } from "@/inngest/channels/telegram";
import { fetchTelegramExecutionRealtimeToken } from "./realtime";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type TelegramNodeData = Partial<TelegramExecutionFormValues>;
type TelegramNodeType = Node<TelegramNodeData>;

export const TelegramExecutionNode: React.FC<NodeProps<TelegramNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const data = props.data || {};

    // Build available context from upstream nodes
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
          variables={variables}
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
