"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  RemoveTagFromContactDialog,
  type RemoveTagFromContactFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchRemoveTagFromContactRealtimeToken } from "./actions";
import { REMOVE_TAG_FROM_CONTACT_CHANNEL_NAME } from "@/inngest/channels/remove-tag-from-contact";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { Tag } from "lucide-react";

type RemoveTagFromContactNodeData = Partial<RemoveTagFromContactFormValues>;
type RemoveTagFromContactNodeType = Node<RemoveTagFromContactNodeData>;

export const RemoveTagFromContactNode: React.FC<NodeProps<RemoveTagFromContactNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const data = props.data || {};

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

    const description = data.tag
      ? `Remove tag: ${data.tag}`
      : "Not configured";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: REMOVE_TAG_FROM_CONTACT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchRemoveTagFromContactRealtimeToken as any,
    });

    const handleSubmit = (values: RemoveTagFromContactFormValues) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...values,
                },
              }
            : node
        )
      );
    };

    return (
      <>
        <RemoveTagFromContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={data}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          icon={Tag}
          name="Remove tag from contact"
          description={description}
          status={nodeStatus}
          onSettings={() => setDialogOpen(true)}
          onDoubleClick={() => setDialogOpen(true)}
        />
      </>
    );
  });

RemoveTagFromContactNode.displayName = "RemoveTagFromContactNode";
