"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { RemoveTagFromClientDialog, type RemoveTagFromClientFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchRemoveTagFromClientRealtimeToken } from "./actions";
import { REMOVE_TAG_FROM_CLIENT_CHANNEL_NAME } from "@/inngest/channels/remove-tag-from-client";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconTag as RemoveTagIcon } from "central-icons/IconTag";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type RemoveTagFromClientNodeData = RemoveTagFromClientFormValues;

type RemoveTagFromClientNodeType = Node<RemoveTagFromClientNodeData>;

export const RemoveTagFromClientNode: React.FC<NodeProps<RemoveTagFromClientNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as RemoveTagFromClientNodeData) || nodeData;
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
      channel: REMOVE_TAG_FROM_CLIENT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchRemoveTagFromClientRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: RemoveTagFromClientFormValues) => {
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
        <RemoveTagFromClientDialog
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
          name="Remove Tag from Client"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

RemoveTagFromClientNode.displayName = "RemoveTagFromClientNode";
