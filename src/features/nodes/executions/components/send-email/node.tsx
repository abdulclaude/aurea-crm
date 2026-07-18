"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { MailIcon } from "lucide-react";
import { memo, useMemo, useState } from "react";

import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { SEND_EMAIL_CHANNEL_NAME } from "@/inngest/channels/send-email";

import { fetchSendEmailRealtimeToken } from "./actions";
import type { SendEmailFormValues } from "./config";
import { SendEmailDialog } from "./dialog";

type SendEmailNodeType = Node<Partial<SendEmailFormValues>>;

export const SendEmailNode = memo((props: NodeProps<SendEmailNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();
  const status = useNodeStatus({
    nodeId: props.id,
    channel: SEND_EMAIL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSendEmailRealtimeToken,
  });
  const variables = useMemo(
    () =>
      dialogOpen
        ? buildNodeContext(props.id, getNodes(), getEdges(), {
            isBundle: workflowContext.isBundle,
            bundleInputs: workflowContext.bundleInputs,
            bundleWorkflowName: workflowContext.workflowName,
            parentWorkflowContext: workflowContext.parentWorkflowContext,
          })
        : [],
    [dialogOpen, getEdges, getNodes, props.id, workflowContext],
  );

  const handleSubmit = (values: SendEmailFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...values } }
          : node,
      ),
    );
  };

  return (
    <>
      <SendEmailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={props.data}
        variables={variables}
        onSubmit={handleSubmit}
      />
      <BaseExecutionNode
        {...props}
        icon={MailIcon}
        name="Send email"
        description={props.data.subject || "Configure client email"}
        status={status}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

SendEmailNode.displayName = "SendEmailNode";
