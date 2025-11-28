"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { IconPeopleEdit as UpdateContactIcon } from "central-icons/IconPeopleEdit";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { UpdateContactDialog, type UpdateContactFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchUpdateContactRealtimeToken } from "./actions";
import { UPDATE_CONTACT_CHANNEL_NAME } from "@/inngest/channels/update-contact";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type UpdateContactNodeData = UpdateContactFormValues;

type UpdateContactNodeType = Node<UpdateContactNodeData>;

export const UpdateContactNode: React.FC<NodeProps<UpdateContactNodeType>> =
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
      return (currentNode?.data as UpdateContactNodeData) || nodeData;
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

    const description = nodeData?.contactId
      ? `Update contact ID: ${nodeData.contactId.slice(0, 20)}...`
      : "Not configured";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: UPDATE_CONTACT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchUpdateContactRealtimeToken,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: UpdateContactFormValues) => {
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
        <UpdateContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={UpdateContactIcon}
          name="Update Contact"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

UpdateContactNode.displayName = "UpdateContactNode";
