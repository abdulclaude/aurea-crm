"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import { StripeSubscriptionCreatedDialog, type StripeSubscriptionCreatedFormValues } from "./dialog";

import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/stripe.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { STRIPE_SUBSCRIPTION_CREATED_CHANNEL_NAME } from "@/inngest/channels/stripe-subscription-created";
import { fetchStripeSubscriptionCreatedRealtimeToken } from "./actions";

type StripeSubscriptionCreatedNodeData = StripeSubscriptionCreatedFormValues;

type StripeSubscriptionCreatedNodeType = Node<StripeSubscriptionCreatedNodeData>;

export const StripeSubscriptionCreatedNode: React.FC<NodeProps<StripeSubscriptionCreatedNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as StripeSubscriptionCreatedNodeData) || nodeData;
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

    const description = "Triggers when a subscription is created";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: STRIPE_SUBSCRIPTION_CREATED_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchStripeSubscriptionCreatedRealtimeToken,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: StripeSubscriptionCreatedFormValues) => {
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
        <StripeSubscriptionCreatedDialog
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
          name="Stripe: Subscription Created"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

StripeSubscriptionCreatedNode.displayName = "StripeSubscriptionCreatedNode";
