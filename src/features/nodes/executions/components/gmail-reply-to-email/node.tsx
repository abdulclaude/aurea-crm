"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GmailReplyToEmailDialog,
  type GmailReplyToEmailFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGmailReplyToEmailRealtimeToken } from "./actions";
import { GMAIL_REPLY_TO_EMAIL_CHANNEL_NAME } from "@/inngest/channels/gmail-reply-to-email";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GmailReplyToEmailNodeData = Partial<GmailReplyToEmailFormValues>;
type GmailReplyToEmailNodeType = Node<GmailReplyToEmailNodeData>;

export const GmailReplyToEmailNode: React.FC<
  NodeProps<GmailReplyToEmailNodeType>
> = memo((props) => {
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

  const description = data.messageId
    ? `Reply to: ${data.messageId.slice(0, 30)}${data.messageId.length > 30 ? "..." : ""}`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GMAIL_REPLY_TO_EMAIL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGmailReplyToEmailRealtimeToken as any,
  });

  const handleSubmit = (values: GmailReplyToEmailFormValues) => {
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
      <GmailReplyToEmailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/gmail.svg"
        name="Gmail reply to email"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GmailReplyToEmailNode.displayName = "GmailReplyToEmailNode";
