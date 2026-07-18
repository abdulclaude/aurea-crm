"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { GmailExecutionDialog, type GmailExecutionFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { GMAIL_CHANNEL_NAME } from "@/inngest/channels/gmail";
import { fetchGmailRealtimeToken } from "./actions";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GmailNodeData = Partial<GmailExecutionFormValues>;
type GmailNodeType = Node<GmailNodeData>;

export const GmailNode: React.FC<NodeProps<GmailNodeType>> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();

  const data = props.data || {};

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
    channel: GMAIL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGmailRealtimeToken,
  });

  const handleSubmit = (values: GmailExecutionFormValues) => {
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
      <GmailExecutionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/google.svg"
        name="Gmail"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
