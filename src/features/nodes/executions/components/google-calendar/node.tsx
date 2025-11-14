"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GoogleCalendarActionDialog,
  type GoogleCalendarActionFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { GOOGLE_CALENDAR_CHANNEL_NAME } from "@/inngest/channels/google-calendar";
import { fetchGoogleCalendarRealtimeToken } from "./actions";

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
  const { setNodes } = useReactFlow();

  const nodeData = props.data || {};
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
