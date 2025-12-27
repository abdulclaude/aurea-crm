"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { OutlookCalendarCreateEventDialog, type OutlookCalendarCreateEventFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchOutlookCalendarCreateEventRealtimeToken } from "./actions";
import { OUTLOOK_CALENDAR_CREATE_EVENT_CHANNEL_NAME } from "@/inngest/channels/outlook-calendar-create-event";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/outlook.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type OutlookCalendarCreateEventNodeData = OutlookCalendarCreateEventFormValues;

type OutlookCalendarCreateEventNodeType = Node<OutlookCalendarCreateEventNodeData>;

export const OutlookCalendarCreateEventNode: React.FC<NodeProps<OutlookCalendarCreateEventNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as OutlookCalendarCreateEventNodeData) || nodeData;
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

    const description = "Create a calendar event";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: OUTLOOK_CALENDAR_CREATE_EVENT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchOutlookCalendarCreateEventRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: OutlookCalendarCreateEventFormValues) => {
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
        <OutlookCalendarCreateEventDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/outlook.svg"
          name="Outlook Calendar: Create Event"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

OutlookCalendarCreateEventNode.displayName = "OutlookCalendarCreateEventNode";
