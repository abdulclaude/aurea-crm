"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { IconPeopleEdit as UpdateClientIcon } from "central-icons/IconPeopleEdit";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { UpdateClientDialog, type UpdateClientFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchUpdateClientRealtimeToken } from "./actions";
import { UPDATE_CLIENT_CHANNEL_NAME } from "@/inngest/channels/update-client";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type UpdateClientNodeData = UpdateClientFormValues;

type UpdateClientNodeType = Node<UpdateClientNodeData>;

export const UpdateClientNode: React.FC<NodeProps<UpdateClientNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    // Get the latest node data from React Flow when dialog is open
    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as UpdateClientNodeData) || nodeData;
    }, [dialogOpen, getNodes, props.id, nodeData]);

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
      ? `Update client ID: ${nodeData.clientId.slice(0, 20)}...`
      : "Not configured";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: UPDATE_CLIENT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchUpdateClientRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: UpdateClientFormValues) => {
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
        <UpdateClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={UpdateClientIcon}
          name="Update Client"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

UpdateClientNode.displayName = "UpdateClientNode";
