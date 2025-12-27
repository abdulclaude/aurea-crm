"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { MoveDealStageDialog, type MoveDealStageFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchMoveDealStageRealtimeToken } from "./actions";
import { MOVE_DEAL_STAGE_CHANNEL_NAME } from "@/inngest/channels/move-deal-stage";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconArrowBoxRight as MoveDealIcon } from "central-icons/IconArrowBoxRight";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type MoveDealStageNodeData = MoveDealStageFormValues;

type MoveDealStageNodeType = Node<MoveDealStageNodeData>;

export const MoveDealStageNode: React.FC<NodeProps<MoveDealStageNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as MoveDealStageNodeData) || nodeData;
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

    const description = nodeData?.pipelineStageId
      ? `Move deal to new stage`
      : "Not configured";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: MOVE_DEAL_STAGE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchMoveDealStageRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: MoveDealStageFormValues) => {
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
        <MoveDealStageDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={MoveDealIcon}
          name="Move Deal Stage"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

MoveDealStageNode.displayName = "MoveDealStageNode";
