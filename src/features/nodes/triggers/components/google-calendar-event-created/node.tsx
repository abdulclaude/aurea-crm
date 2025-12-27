"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import { GoogleCalendarEventCreatedDialog, type GoogleCalendarEventCreatedFormValues } from "./dialog";

import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/googlecalendar.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { GOOGLE_CALENDAR_EVENT_CREATED_CHANNEL_NAME } from "@/inngest/channels/google-calendar-event-created";
import { fetchGoogleCalendarEventCreatedRealtimeToken } from "./actions";

type GoogleCalendarEventCreatedNodeData = GoogleCalendarEventCreatedFormValues;

type GoogleCalendarEventCreatedNodeType = Node<GoogleCalendarEventCreatedNodeData>;

export const GoogleCalendarEventCreatedNode: React.FC<NodeProps<GoogleCalendarEventCreatedNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as GoogleCalendarEventCreatedNodeData) || nodeData;
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

    const description = "Triggers when a calendar event is created";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: GOOGLE_CALENDAR_EVENT_CREATED_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchGoogleCalendarEventCreatedRealtimeToken,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GoogleCalendarEventCreatedFormValues) => {
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
        <GoogleCalendarEventCreatedDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseTriggerNode
          {...props}
          id={props.id}
          icon="/logos/googlecalendar.svg"
          name="Google Calendar: Event Created"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

GoogleCalendarEventCreatedNode.displayName = "GoogleCalendarEventCreatedNode";
