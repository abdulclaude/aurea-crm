"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { GeminiGenerateTextDialog, type GeminiGenerateTextFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchGeminiGenerateTextRealtimeToken } from "./actions";
import { GEMINI_GENERATE_TEXT_CHANNEL_NAME } from "@/inngest/channels/gemini-generate-text";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconSparkle as SparklesIcon } from "central-icons/IconSparkle";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GeminiGenerateTextNodeData = GeminiGenerateTextFormValues;

type GeminiGenerateTextNodeType = Node<GeminiGenerateTextNodeData>;

export const GeminiGenerateTextNode: React.FC<NodeProps<GeminiGenerateTextNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as GeminiGenerateTextNodeData) || nodeData;
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

    const description = "Generate text using Gemini AI";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: GEMINI_GENERATE_TEXT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchGeminiGenerateTextRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GeminiGenerateTextFormValues) => {
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
        <GeminiGenerateTextDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={SparklesIcon}
          name="Gemini: Generate Text"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

GeminiGenerateTextNode.displayName = "GeminiGenerateTextNode";
