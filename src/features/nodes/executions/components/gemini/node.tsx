"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  type GeminiFormValues,
  AVAILABLE_MODELS,
  GeminiDialog,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchGeminiRealtimeToken } from "./actions";
import { GEMINI_CHANNEL_NAME } from "@/inngest/channels/gemini";

type GeminiNodeData = {
  variableName: string;
  model?: (typeof AVAILABLE_MODELS)[number];
  credentialId?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

type GeminiNodeType = Node<GeminiNodeData>;

export const GeminiNode: React.FC<NodeProps<GeminiNodeType>> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeData = props.data;

  const description = nodeData?.userPrompt
    ? `${nodeData.model || AVAILABLE_MODELS[0]}: ${nodeData.userPrompt.slice(
        0,
        50
      )}...`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GEMINI_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGeminiRealtimeToken,
  });

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: GeminiFormValues) => {
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
      <GeminiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/gemini.svg"
        name="Gemini"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

GeminiNode.displayName = "GeminiNode";
