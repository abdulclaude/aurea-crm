"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { GeminiTransformDialog, type GeminiTransformFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchGeminiTransformRealtimeToken } from "./actions";
import { GEMINI_TRANSFORM_CHANNEL_NAME } from "@/inngest/channels/gemini-transform";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconMagicWand as WandIcon } from "central-icons/IconMagicWand";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GeminiTransformNodeData = GeminiTransformFormValues;

type GeminiTransformNodeType = Node<GeminiTransformNodeData>;

export const GeminiTransformNode: React.FC<NodeProps<GeminiTransformNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as GeminiTransformNodeData) || nodeData;
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

    const description = "Transform text using Gemini AI";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: GEMINI_TRANSFORM_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchGeminiTransformRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GeminiTransformFormValues) => {
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
        <GeminiTransformDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={WandIcon}
          name="Gemini: Transform"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

GeminiTransformNode.displayName = "GeminiTransformNode";
