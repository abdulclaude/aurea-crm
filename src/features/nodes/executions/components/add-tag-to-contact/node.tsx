"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  AddTagToContactDialog,
  type AddTagToContactFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchAddTagToContactRealtimeToken } from "./actions";
import { ADD_TAG_TO_CONTACT_CHANNEL_NAME } from "@/inngest/channels/add-tag-to-contact";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { Tag } from "lucide-react";

type AddTagToContactNodeData = Partial<AddTagToContactFormValues>;
type AddTagToContactNodeType = Node<AddTagToContactNodeData>;

export const AddTagToContactNode: React.FC<NodeProps<AddTagToContactNodeType>> =
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
      ? `Add tag: ${data.tag}`
      : "Not configured";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: ADD_TAG_TO_CONTACT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchAddTagToContactRealtimeToken as any,
    });

    const handleSubmit = (values: AddTagToContactFormValues) => {
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
        <AddTagToContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={data}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          icon={Tag}
          name="Add tag to contact"
          description={description}
          status={nodeStatus}
          onSettings={() => setDialogOpen(true)}
          onDoubleClick={() => setDialogOpen(true)}
        />
      </>
    );
  });

AddTagToContactNode.displayName = "AddTagToContactNode";
