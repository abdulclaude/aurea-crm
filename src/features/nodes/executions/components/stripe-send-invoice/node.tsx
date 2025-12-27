"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { StripeSendInvoiceDialog, type StripeSendInvoiceFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchStripeSendInvoiceRealtimeToken } from "./actions";
import { STRIPE_SEND_INVOICE_CHANNEL_NAME } from "@/inngest/channels/stripe-send-invoice";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/stripe.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type StripeSendInvoiceNodeData = StripeSendInvoiceFormValues;

type StripeSendInvoiceNodeType = Node<StripeSendInvoiceNodeData>;

export const StripeSendInvoiceNode: React.FC<NodeProps<StripeSendInvoiceNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as StripeSendInvoiceNodeData) || nodeData;
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

    const description = "Send a Stripe invoice";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: STRIPE_SEND_INVOICE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchStripeSendInvoiceRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: StripeSendInvoiceFormValues) => {
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
        <StripeSendInvoiceDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/stripe.svg"
          name="Stripe: Send Invoice"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

StripeSendInvoiceNode.displayName = "StripeSendInvoiceNode";
