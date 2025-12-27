"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { GoogleCalendarFindAvailableTimesDialog, type GoogleCalendarFindAvailableTimesFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchGoogleCalendarFindAvailableTimesRealtimeToken } from "./actions";
import { GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES_CHANNEL_NAME } from "@/inngest/channels/google-calendar-find-available-times";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/googlecalendar.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GoogleCalendarFindAvailableTimesNodeData = GoogleCalendarFindAvailableTimesFormValues;

type GoogleCalendarFindAvailableTimesNodeType = Node<GoogleCalendarFindAvailableTimesNodeData>;

export const GoogleCalendarFindAvailableTimesNode: React.FC<NodeProps<GoogleCalendarFindAvailableTimesNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as GoogleCalendarFindAvailableTimesNodeData) || nodeData;
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

    const description = "Find available time slots in Google Calendar";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchGoogleCalendarFindAvailableTimesRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GoogleCalendarFindAvailableTimesFormValues) => {
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
        <GoogleCalendarFindAvailableTimesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/googlecalendar.svg"
          name="Google Calendar: Find Available Times"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

GoogleCalendarFindAvailableTimesNode.displayName = "GoogleCalendarFindAvailableTimesNode";
