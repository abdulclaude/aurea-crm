"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { TelegramSendPhotoDialog, type TelegramSendPhotoFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchTelegramSendPhotoRealtimeToken } from "./actions";
import { TELEGRAM_SEND_PHOTO_CHANNEL_NAME } from "@/inngest/channels/telegram-send-photo";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/telegram.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type TelegramSendPhotoNodeData = TelegramSendPhotoFormValues;

type TelegramSendPhotoNodeType = Node<TelegramSendPhotoNodeData>;

export const TelegramSendPhotoNode: React.FC<NodeProps<TelegramSendPhotoNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as TelegramSendPhotoNodeData) || nodeData;
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

    const description = "Send a photo via Telegram";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: TELEGRAM_SEND_PHOTO_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchTelegramSendPhotoRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: TelegramSendPhotoFormValues) => {
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
        <TelegramSendPhotoDialog
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
          name="Telegram: Send Photo"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

TelegramSendPhotoNode.displayName = "TelegramSendPhotoNode";
