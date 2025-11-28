"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { MoveRight } from "lucide-react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  UpdatePipelineDialog,
  type UpdatePipelineFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchUpdatePipelineRealtimeToken } from "./actions";
import { UPDATE_PIPELINE_CHANNEL_NAME } from "@/inngest/channels/update-pipeline";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type UpdatePipelineNodeData = UpdatePipelineFormValues;

type UpdatePipelineNodeType = Node<UpdatePipelineNodeData>;

export const UpdatePipelineNode: React.FC<
  NodeProps<UpdatePipelineNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();

  const nodeData = props.data;

  // Build available context from upstream nodes
  // Recalculate when dialog opens to get latest variableName changes
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

  const description = nodeData?.dealId
    ? `Move deal to stage: ${nodeData.pipelineStageId?.slice(0, 20)}...`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: UPDATE_PIPELINE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchUpdatePipelineRealtimeToken,
  });

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: UpdatePipelineFormValues) => {
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
      <UpdatePipelineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={MoveRight}
        name="Update Pipeline"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

UpdatePipelineNode.displayName = "UpdatePipelineNode";
