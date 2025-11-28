"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { UserMinus } from "lucide-react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  DeleteContactDialog,
  type DeleteContactFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchDeleteContactRealtimeToken } from "./actions";
import { DELETE_CONTACT_CHANNEL_NAME } from "@/inngest/channels/delete-contact";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type DeleteContactNodeData = DeleteContactFormValues;

type DeleteContactNodeType = Node<DeleteContactNodeData>;

export const DeleteContactNode: React.FC<
  NodeProps<DeleteContactNodeType>
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

  const description = nodeData?.contactId
    ? `Delete contact: ${nodeData.contactId.slice(0, 20)}...`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: DELETE_CONTACT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchDeleteContactRealtimeToken,
  });

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: DeleteContactFormValues) => {
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
      <DeleteContactDialog
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
        name="Delete Contact"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

DeleteContactNode.displayName = "DeleteContactNode";
