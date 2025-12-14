"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GoogleCalendarDeleteEventDialog,
  type GoogleCalendarDeleteEventFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGoogleCalendarDeleteEventRealtimeToken } from "./actions";
import { GOOGLE_CALENDAR_DELETE_EVENT_CHANNEL_NAME } from "@/inngest/channels/google-calendar-delete-event";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GoogleCalendarDeleteEventNodeData = Partial<GoogleCalendarDeleteEventFormValues>;
type GoogleCalendarDeleteEventNodeType = Node<GoogleCalendarDeleteEventNodeData>;

export const GoogleCalendarDeleteEventNode: React.FC<
  NodeProps<GoogleCalendarDeleteEventNodeType>
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
    ? `Delete event: ${data.eventId.slice(0, 20)}...`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_CALENDAR_DELETE_EVENT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleCalendarDeleteEventRealtimeToken as any,
  });

  const handleSubmit = (values: GoogleCalendarDeleteEventFormValues) => {
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
      <GoogleCalendarDeleteEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/google-calendar.svg"
        name="Google Calendar delete event"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GoogleCalendarDeleteEventNode.displayName = "GoogleCalendarDeleteEventNode";
