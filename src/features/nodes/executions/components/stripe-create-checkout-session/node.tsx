"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { StripeCreateCheckoutSessionDialog, type StripeCreateCheckoutSessionFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchStripeCreateCheckoutSessionRealtimeToken } from "./actions";
import { STRIPE_CREATE_CHECKOUT_SESSION_CHANNEL_NAME } from "@/inngest/channels/stripe-create-checkout-session";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/stripe.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type StripeCreateCheckoutSessionNodeData = StripeCreateCheckoutSessionFormValues;

type StripeCreateCheckoutSessionNodeType = Node<StripeCreateCheckoutSessionNodeData>;

export const StripeCreateCheckoutSessionNode: React.FC<NodeProps<StripeCreateCheckoutSessionNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as StripeCreateCheckoutSessionNodeData) || nodeData;
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

    const description = "Create a Stripe checkout session";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: STRIPE_CREATE_CHECKOUT_SESSION_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchStripeCreateCheckoutSessionRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: StripeCreateCheckoutSessionFormValues) => {
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
        <StripeCreateCheckoutSessionDialog
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
          name="Stripe: Create Checkout Session"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

StripeCreateCheckoutSessionNode.displayName = "StripeCreateCheckoutSessionNode";
