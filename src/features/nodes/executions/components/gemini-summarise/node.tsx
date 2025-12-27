"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GeminiSummariseDialog,
  type GeminiSummariseFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchGeminiSummariseRealtimeToken } from "./actions";
import { GEMINI_SUMMARISE_CHANNEL_NAME } from "@/inngest/channels/gemini-summarise";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconFileSparkle as SummariseIcon } from "central-icons/IconFileSparkle";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GeminiSummariseNodeData = GeminiSummariseFormValues;

type GeminiSummariseNodeType = Node<GeminiSummariseNodeData>;

export const GeminiSummariseNode: React.FC<NodeProps<GeminiSummariseNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as GeminiSummariseNodeData) || nodeData;
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

    const description = "Summarise text using Gemini AI";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: GEMINI_SUMMARISE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchGeminiSummariseRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GeminiSummariseFormValues) => {
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
        <GeminiSummariseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={SummariseIcon}
          name="Gemini: Summarise"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

GeminiSummariseNode.displayName = "GeminiSummariseNode";
