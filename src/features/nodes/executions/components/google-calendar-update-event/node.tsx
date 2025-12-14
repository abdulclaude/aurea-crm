"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GoogleCalendarUpdateEventDialog,
  type GoogleCalendarUpdateEventFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGoogleCalendarUpdateEventRealtimeToken } from "./actions";
import { GOOGLE_CALENDAR_UPDATE_EVENT_CHANNEL_NAME } from "@/inngest/channels/google-calendar-update-event";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GoogleCalendarUpdateEventNodeData = Partial<GoogleCalendarUpdateEventFormValues>;
type GoogleCalendarUpdateEventNodeType = Node<GoogleCalendarUpdateEventNodeData>;

export const GoogleCalendarUpdateEventNode: React.FC<
  NodeProps<GoogleCalendarUpdateEventNodeType>
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

  const description = data.eventId
    ? `Update event: ${data.eventId.slice(0, 20)}...`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_CALENDAR_UPDATE_EVENT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleCalendarUpdateEventRealtimeToken as any,
  });

  const handleSubmit = (values: GoogleCalendarUpdateEventFormValues) => {
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
      <GoogleCalendarUpdateEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/google-calendar.svg"
        name="Google Calendar update event"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GoogleCalendarUpdateEventNode.displayName = "GoogleCalendarUpdateEventNode";
