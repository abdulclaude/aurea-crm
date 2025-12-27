"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { OutlookReplyToEmailDialog, type OutlookReplyToEmailFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchOutlookReplyToEmailRealtimeToken } from "./actions";
import { OUTLOOK_REPLY_TO_EMAIL_CHANNEL_NAME } from "@/inngest/channels/outlook-reply-to-email";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/outlook.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type OutlookReplyToEmailNodeData = OutlookReplyToEmailFormValues;

type OutlookReplyToEmailNodeType = Node<OutlookReplyToEmailNodeData>;

export const OutlookReplyToEmailNode: React.FC<NodeProps<OutlookReplyToEmailNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as OutlookReplyToEmailNodeData) || nodeData;
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

    const description = "Reply to an email";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: OUTLOOK_REPLY_TO_EMAIL_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchOutlookReplyToEmailRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: OutlookReplyToEmailFormValues) => {
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
        <OutlookReplyToEmailDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/outlook.svg"
          name="Outlook: Reply to Email"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

OutlookReplyToEmailNode.displayName = "OutlookReplyToEmailNode";
