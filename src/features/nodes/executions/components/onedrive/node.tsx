"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { OneDriveExecutionDialog, type OneDriveExecutionFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { ONEDRIVE_CHANNEL_NAME } from "@/inngest/channels/onedrive";
import { fetchOneDriveRealtimeToken } from "./actions";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type OneDriveNodeData = Partial<OneDriveExecutionFormValues>;
type OneDriveNodeType = Node<OneDriveNodeData>;

export const OneDriveNode: React.FC<NodeProps<OneDriveNodeType>> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();

  const data = props.data || {};

  // Get the latest node data from React Flow when dialog is open
  const currentData = useMemo(() => {
    if (!dialogOpen) return data;
    const nodes = getNodes();
    const currentNode = nodes.find((n) => n.id === props.id);
    return (currentNode?.data as OneDriveNodeData) || data;
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

  const description = data.action
    ? `${data.action === "upload" ? "Upload to" : "Download from"} ${data.filePath || "OneDrive"}`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: ONEDRIVE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchOneDriveRealtimeToken as any,
  });

  const handleSubmit = (values: OneDriveExecutionFormValues) => {
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
      <OneDriveExecutionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={currentData}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/microsoft.svg"
        name="OneDrive"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});
