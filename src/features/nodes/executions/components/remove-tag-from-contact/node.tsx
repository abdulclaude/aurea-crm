"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { RemoveTagFromContactDialog, type RemoveTagFromContactFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchRemoveTagFromContactRealtimeToken } from "./actions";
import { REMOVE_TAG_FROM_CONTACT_CHANNEL_NAME } from "@/inngest/channels/remove-tag-from-contact";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconTag as RemoveTagIcon } from "central-icons/IconTag";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type RemoveTagFromContactNodeData = RemoveTagFromContactFormValues;

type RemoveTagFromContactNodeType = Node<RemoveTagFromContactNodeData>;

export const RemoveTagFromContactNode: React.FC<NodeProps<RemoveTagFromContactNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as RemoveTagFromContactNodeData) || nodeData;
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

    const description = nodeData?.tag
      ? `Remove tag: ${nodeData.tag}`
      : "Not configured";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: REMOVE_TAG_FROM_CONTACT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchRemoveTagFromContactRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: RemoveTagFromContactFormValues) => {
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
        <RemoveTagFromContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={RemoveTagIcon}
          name="Remove Tag from Contact"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

RemoveTagFromContactNode.displayName = "RemoveTagFromContactNode";
