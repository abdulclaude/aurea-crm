"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { GoogleFormCreateResponseDialog, type GoogleFormCreateResponseFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchGoogleFormCreateResponseRealtimeToken } from "./actions";
import { GOOGLE_FORM_CREATE_RESPONSE_CHANNEL_NAME } from "@/inngest/channels/google-form-create-response";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/googleform.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GoogleFormCreateResponseNodeData = GoogleFormCreateResponseFormValues;

type GoogleFormCreateResponseNodeType = Node<GoogleFormCreateResponseNodeData>;

export const GoogleFormCreateResponseNode: React.FC<NodeProps<GoogleFormCreateResponseNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as GoogleFormCreateResponseNodeData) || nodeData;
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

    const description = "Submit a response to a Google Form";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: GOOGLE_FORM_CREATE_RESPONSE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchGoogleFormCreateResponseRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GoogleFormCreateResponseFormValues) => {
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
        <GoogleFormCreateResponseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/googleform.svg"
          name="Google Forms: Create Response"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

GoogleFormCreateResponseNode.displayName = "GoogleFormCreateResponseNode";
