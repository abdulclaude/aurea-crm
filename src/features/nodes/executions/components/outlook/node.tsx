"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { OutlookExecutionDialog, type OutlookExecutionFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { OUTLOOK_CHANNEL_NAME } from "@/inngest/channels/outlook";
import { fetchOutlookRealtimeToken } from "./actions";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type OutlookNodeData = Partial<OutlookExecutionFormValues>;
type OutlookNodeType = Node<OutlookNodeData>;

export const OutlookNode: React.FC<NodeProps<OutlookNodeType>> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();

  const data = props.data || {};

  // Get the latest node data from React Flow when dialog is open
  const currentData = useMemo(() => {
    if (!dialogOpen) return data;
    const nodes = getNodes();
    const currentNode = nodes.find((n) => n.id === props.id);
    return (currentNode?.data as OutlookNodeData) || data;
  }, [dialogOpen, getNodes, props.id, data]);

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

  const description = data.to
    ? `Email ${data.to.split(",")[0].trim()}`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: OUTLOOK_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchOutlookRealtimeToken,
  });

  const handleSubmit = (values: OutlookExecutionFormValues) => {
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

  const handleOpen = () => setDialogOpen(true);

  return (
    <>
      <OutlookExecutionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={currentData}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/microsoft.svg"
        name="Outlook"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
