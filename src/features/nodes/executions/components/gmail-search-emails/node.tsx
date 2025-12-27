"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GmailSearchEmailsDialog,
  type GmailSearchEmailsFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGmailSearchEmailsRealtimeToken } from "./actions";
import { GMAIL_SEARCH_EMAILS_CHANNEL_NAME } from "@/inngest/channels/gmail-search-emails";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GmailSearchEmailsNodeData = Partial<GmailSearchEmailsFormValues>;
type GmailSearchEmailsNodeType = Node<GmailSearchEmailsNodeData>;

export const GmailSearchEmailsNode: React.FC<
  NodeProps<GmailSearchEmailsNodeType>
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

  const description = data.query
    ? `Query: ${data.query.slice(0, 30)}${data.query.length > 30 ? "..." : ""}`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GMAIL_SEARCH_EMAILS_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGmailSearchEmailsRealtimeToken,
  });

  const handleSubmit = (values: GmailSearchEmailsFormValues) => {
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
      <GmailSearchEmailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/gmail.svg"
        name="Gmail search emails"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GmailSearchEmailsNode.displayName = "GmailSearchEmailsNode";
