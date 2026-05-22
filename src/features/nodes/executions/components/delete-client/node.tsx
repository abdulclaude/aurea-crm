"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { UserMinus } from "lucide-react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  DeleteClientDialog,
  type DeleteClientFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchDeleteClientRealtimeToken } from "./actions";
import { DELETE_CLIENT_CHANNEL_NAME } from "@/inngest/channels/delete-client";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type DeleteClientNodeData = DeleteClientFormValues;

type DeleteClientNodeType = Node<DeleteClientNodeData>;

export const DeleteClientNode: React.FC<
  NodeProps<DeleteClientNodeType>
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

  const description = nodeData?.clientId
    ? `Delete client: ${nodeData.clientId.slice(0, 20)}...`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: DELETE_CLIENT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchDeleteClientRealtimeToken as any,
  });

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: DeleteClientFormValues) => {
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
      <DeleteClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={UserMinus}
        name="Delete Client"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

DeleteClientNode.displayName = "DeleteClientNode";
