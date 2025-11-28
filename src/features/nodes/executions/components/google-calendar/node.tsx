"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GoogleCalendarActionDialog,
  type GoogleCalendarActionFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { GOOGLE_CALENDAR_CHANNEL_NAME } from "@/inngest/channels/google-calendar";
import { fetchGoogleCalendarRealtimeToken } from "./actions";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

export type GoogleCalendarActionNodeData = {
  variableName?: string;
  calendarId?: string;
  summary?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  timezone?: string;
};

type GoogleCalendarActionNodeType = Node<GoogleCalendarActionNodeData>;

export const GoogleCalendarActionNode: React.FC<
  NodeProps<GoogleCalendarActionNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();

  const nodeData = props.data || {};

  // Build available context from upstream nodes
  // Recalculate when dialog opens to get latest variableName changes
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
  const description = nodeData.summary
    ? `Create "${nodeData.summary}"`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_CALENDAR_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleCalendarRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: GoogleCalendarActionFormValues) => {
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
      <GoogleCalendarActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/googlecalendar.svg"
        name="Google Calendar Event"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
      {/* <div className="flex flex-col text-left gap-1">
          <span className="text-xs text-white/80 font-medium">
            {nodeData.calendarId || "Select a calendar"}
          </span>
          <span className="text-[11px] text-white/50">
            {nodeData.startDateTime && nodeData.endDateTime
              ? `${nodeData.startDateTime} → ${nodeData.endDateTime}`
              : "Set start and end time"}
          </span>
        </div> */}
    </>
  );
});
