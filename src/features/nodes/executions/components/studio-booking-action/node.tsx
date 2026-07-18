"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { CalendarCheck2 } from "lucide-react";
import { memo, useMemo, useState } from "react";

import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { STUDIO_BOOKING_ACTION_CHANNEL_NAME } from "@/inngest/channels/studio-booking-action";

import { fetchStudioBookingActionRealtimeToken } from "./actions";
import {
  STUDIO_BOOKING_OPERATION_LABELS,
  studioBookingActionDefaults,
  type StudioBookingActionFormValues,
} from "./config";
import { StudioBookingActionDialog } from "./dialog";

type StudioBookingActionNodeType = Node<Partial<StudioBookingActionFormValues>>;

export const StudioBookingActionNode = memo(
  (props: NodeProps<StudioBookingActionNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();
    const data = studioBookingActionDefaults(props.data);
    const status = useNodeStatus({
      nodeId: props.id,
      channel: STUDIO_BOOKING_ACTION_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchStudioBookingActionRealtimeToken,
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
    const handleSubmit = (values: StudioBookingActionFormValues) => {
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
        <StudioBookingActionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={props.data}
          variables={variables}
        />
        <BaseExecutionNode
          {...props}
          icon={CalendarCheck2}
          name={STUDIO_BOOKING_OPERATION_LABELS[data.operation]}
          description={describeAction(data)}
          status={status}
          onSettings={() => setDialogOpen(true)}
          onDoubleClick={() => setDialogOpen(true)}
        />
      </>
    );
  },
);

StudioBookingActionNode.displayName = "StudioBookingActionNode";

function describeAction(data: StudioBookingActionFormValues): string {
  const member = data.clientName ?? "the workflow member";
  const className = data.className ?? "the workflow class";
  if (data.operation === "CHECK_IN") return `Check ${member} into ${className}`;
  if (data.operation === "MARK_NO_SHOW") {
    return `Mark ${member} as a no-show for ${className}`;
  }
  if (data.operation === "JOIN_WAITLIST") {
    return `Add ${member} to the ${className} waitlist`;
  }
  return `Remove ${member} from the ${className} waitlist`;
}
