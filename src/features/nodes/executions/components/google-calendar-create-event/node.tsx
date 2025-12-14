"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GoogleCalendarCreateEventDialog,
  type GoogleCalendarCreateEventFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGoogleCalendarCreateEventRealtimeToken } from "./actions";
import { GOOGLE_CALENDAR_CREATE_EVENT_CHANNEL_NAME } from "@/inngest/channels/google-calendar-create-event";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GoogleCalendarCreateEventNodeData = Partial<GoogleCalendarCreateEventFormValues>;
type GoogleCalendarCreateEventNodeType = Node<GoogleCalendarCreateEventNodeData>;

export const GoogleCalendarCreateEventNode: React.FC<
  NodeProps<GoogleCalendarCreateEventNodeType>
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

  const description = data.summary
    ? `${data.summary.slice(0, 30)}${data.summary.length > 30 ? "..." : ""}`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_CALENDAR_CREATE_EVENT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleCalendarCreateEventRealtimeToken as any,
  });

  const handleSubmit = (values: GoogleCalendarCreateEventFormValues) => {
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
      <GoogleCalendarCreateEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/google-calendar.svg"
        name="Google Calendar create event"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GoogleCalendarCreateEventNode.displayName = "GoogleCalendarCreateEventNode";
