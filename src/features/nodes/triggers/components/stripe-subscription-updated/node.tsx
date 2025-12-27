"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import { StripeSubscriptionUpdatedDialog, type StripeSubscriptionUpdatedFormValues } from "./dialog";

import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/stripe.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { STRIPE_SUBSCRIPTION_UPDATED_CHANNEL_NAME } from "@/inngest/channels/stripe-subscription-updated";
import { fetchStripeSubscriptionUpdatedRealtimeToken } from "./actions";

type StripeSubscriptionUpdatedNodeData = StripeSubscriptionUpdatedFormValues;

type StripeSubscriptionUpdatedNodeType = Node<StripeSubscriptionUpdatedNodeData>;

export const StripeSubscriptionUpdatedNode: React.FC<NodeProps<StripeSubscriptionUpdatedNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as StripeSubscriptionUpdatedNodeData) || nodeData;
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

    const description = "Triggers when a subscription is updated";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: STRIPE_SUBSCRIPTION_UPDATED_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchStripeSubscriptionUpdatedRealtimeToken,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: StripeSubscriptionUpdatedFormValues) => {
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
        <StripeSubscriptionUpdatedDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseTriggerNode
          {...props}
          id={props.id}
          icon="/logos/stripe.svg"
          name="Stripe: Subscription Updated"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

StripeSubscriptionUpdatedNode.displayName = "StripeSubscriptionUpdatedNode";
