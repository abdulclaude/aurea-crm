"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GoogleFormReadResponsesDialog,
  type GoogleFormReadResponsesFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGoogleFormReadResponsesRealtimeToken } from "./actions";
import { GOOGLE_FORM_READ_RESPONSES_CHANNEL_NAME } from "@/inngest/channels/google-form-read-responses";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GoogleFormReadResponsesNodeData = Partial<GoogleFormReadResponsesFormValues>;
type GoogleFormReadResponsesNodeType = Node<GoogleFormReadResponsesNodeData>;

export const GoogleFormReadResponsesNode: React.FC<
  NodeProps<GoogleFormReadResponsesNodeType>
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

  const description = data.formId
    ? `Form ID: ${data.formId.substring(0, 20)}${data.formId.length > 20 ? "..." : ""}`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_FORM_READ_RESPONSES_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleFormReadResponsesRealtimeToken as any,
  });

  const handleSubmit = (values: GoogleFormReadResponsesFormValues) => {
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
      <GoogleFormReadResponsesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/googleform.svg"
        name="Google Forms read responses"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GoogleFormReadResponsesNode.displayName = "GoogleFormReadResponsesNode";
