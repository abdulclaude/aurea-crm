"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { WaitDialog, type WaitFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchWaitRealtimeToken } from "./actions";
import { WAIT_CHANNEL_NAME } from "@/inngest/channels/wait";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type WaitNodeData = {
  variableName?: string;
  duration?: number;
  unit?: "seconds" | "minutes" | "hours" | "days";
};

type WaitNodeType = Node<WaitNodeData>;

export const WaitNode: React.FC<NodeProps<WaitNodeType>> = memo((props) => {
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

  const description = nodeData?.duration
    ? `Wait ${nodeData.duration} ${nodeData.unit || "seconds"}`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: WAIT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWaitRealtimeToken,
  });

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: WaitFormValues) => {
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
      <WaitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Clock}
        name="Wait"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

WaitNode.displayName = "WaitNode";
