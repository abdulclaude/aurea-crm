"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { AddDealNoteDialog, type AddDealNoteFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchAddDealNoteRealtimeToken } from "./actions";
import { ADD_DEAL_NOTE_CHANNEL_NAME } from "@/inngest/channels/add-deal-note";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconNote2 as AddNoteIcon } from "central-icons/IconNote2";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type AddDealNoteNodeData = AddDealNoteFormValues;

type AddDealNoteNodeType = Node<AddDealNoteNodeData>;

export const AddDealNoteNode: React.FC<NodeProps<AddDealNoteNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as AddDealNoteNodeData) || nodeData;
    }, [dialogOpen, getNodes, props.id, nodeData]);

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

    const description = nodeData?.note
      ? `Add note to deal`
      : "Not configured";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: ADD_DEAL_NOTE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchAddDealNoteRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: AddDealNoteFormValues) => {
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
        <AddDealNoteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={AddNoteIcon}
          name="Add Deal Note"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

AddDealNoteNode.displayName = "AddDealNoteNode";
