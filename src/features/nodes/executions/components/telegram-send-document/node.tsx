"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { TelegramSendDocumentDialog, type TelegramSendDocumentFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchTelegramSendDocumentRealtimeToken } from "./actions";
import { TELEGRAM_SEND_DOCUMENT_CHANNEL_NAME } from "@/inngest/channels/telegram-send-document";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/telegram.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type TelegramSendDocumentNodeData = TelegramSendDocumentFormValues;

type TelegramSendDocumentNodeType = Node<TelegramSendDocumentNodeData>;

export const TelegramSendDocumentNode: React.FC<NodeProps<TelegramSendDocumentNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as TelegramSendDocumentNodeData) || nodeData;
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

    const description = "Send a document via Telegram";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: TELEGRAM_SEND_DOCUMENT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchTelegramSendDocumentRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: TelegramSendDocumentFormValues) => {
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
        <TelegramSendDocumentDialog
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
          name="Telegram: Send Document"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

TelegramSendDocumentNode.displayName = "TelegramSendDocumentNode";
