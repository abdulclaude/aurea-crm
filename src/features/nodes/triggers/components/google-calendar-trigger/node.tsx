"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "../../base-trigger-node";
import {
  GoogleCalendarTriggerDialog,
  type GoogleCalendarTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { GOOGLE_CALENDAR_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/google-calendar-trigger";
import { fetchGoogleCalendarTriggerRealtimeToken } from "./actions";

type GoogleCalendarTriggerNodeData = {
  calendarId?: string;
  calendarName?: string;
  listenFor?: string[];
  timezone?: string;
  variableName?: string;
};

type GoogleCalendarTriggerNodeType = Node<GoogleCalendarTriggerNodeData>;

export const GoogleCalendarNode: React.FC<
  NodeProps<GoogleCalendarTriggerNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_CALENDAR_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleCalendarTriggerRealtimeToken,
  });

  const nodeData = props.data || {};
  const calendarLabel = nodeData.calendarName || nodeData.calendarId;
  const eventLabel = nodeData.listenFor?.length
    ? nodeData.listenFor.join(", ")
    : undefined;

  const description = calendarLabel
    ? `Listening to ${calendarLabel}`
    : "Not configured";

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: GoogleCalendarTriggerFormValues) => {
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
      <GoogleCalendarTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: nodeData.variableName || "googleCalendar",
          calendarId: nodeData.calendarId || "",
          calendarName: nodeData.calendarName || "",
          listenFor: nodeData.listenFor as (
            | "created"
            | "updated"
            | "deleted"
          )[],
          timezone: nodeData.timezone || "",
        }}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon="/logos/googlecalendar.svg"
        name="Google Calendar Trigger"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
      {/* <div className="flex flex-col gap-1 text-left">
          {calendarLabel ? (
            <span className="text-xs text-white/80 font-medium">
              {calendarLabel}
            </span>
          ) : (
            <span className="text-xs text-white/50">
              Select a calendar to start listening.
            </span>
          )}
          <span className="text-[11px] text-white/50">
            Events: {eventLabel || "choose events"}
          </span>
        </div> */}
    </>
  );
});
