"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GmailSendEmailDialog,
  type GmailSendEmailFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGmailSendEmailRealtimeToken } from "./actions";
import { GMAIL_SEND_EMAIL_CHANNEL_NAME } from "@/inngest/channels/gmail-send-email";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GmailSendEmailNodeData = Partial<GmailSendEmailFormValues>;
type GmailSendEmailNodeType = Node<GmailSendEmailNodeData>;

export const GmailSendEmailNode: React.FC<
  NodeProps<GmailSendEmailNodeType>
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

  const description = data.to && data.subject
    ? `To: ${data.to.slice(0, 30)}${data.to.length > 30 ? "..." : ""}`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GMAIL_SEND_EMAIL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGmailSendEmailRealtimeToken,
  });

  const handleSubmit = (values: GmailSendEmailFormValues) => {
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
      <GmailSendEmailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/gmail.svg"
        name="Gmail send email"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GmailSendEmailNode.displayName = "GmailSendEmailNode";
