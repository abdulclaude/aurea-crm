"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { CreateClientDialog, type CreateClientFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchCreateClientRealtimeToken } from "./actions";
import { CREATE_CLIENT_CHANNEL_NAME } from "@/inngest/channels/create-client";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconPeopleAdd as CreateClientIcon } from "central-icons/IconPeopleAdd";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type CreateClientNodeData = CreateClientFormValues;

type CreateClientNodeType = Node<CreateClientNodeData>;

export const CreateClientNode: React.FC<NodeProps<CreateClientNodeType>> =
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
      return (currentNode?.data as CreateClientNodeData) || nodeData;
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

    const description = nodeData?.name
      ? `Create client: ${nodeData.name.slice(0, 30)}...`
      : "Not configured";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: CREATE_CLIENT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchCreateClientRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: CreateClientFormValues) => {
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
        <CreateClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={CreateClientIcon}
          name="Create Client"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

CreateClientNode.displayName = "CreateClientNode";
