"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import { OutlookCalendarEventCreatedDialog, type OutlookCalendarEventCreatedFormValues } from "./dialog";

import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/outlook.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { OUTLOOK_CALENDAR_EVENT_CREATED_CHANNEL_NAME } from "@/inngest/channels/outlook-calendar-event-created";
import { fetchOutlookCalendarEventCreatedRealtimeToken } from "./actions";

type OutlookCalendarEventCreatedNodeData = OutlookCalendarEventCreatedFormValues;

type OutlookCalendarEventCreatedNodeType = Node<OutlookCalendarEventCreatedNodeData>;

export const OutlookCalendarEventCreatedNode: React.FC<NodeProps<OutlookCalendarEventCreatedNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as OutlookCalendarEventCreatedNodeData) || nodeData;
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
      channel: OUTLOOK_CALENDAR_EVENT_CREATED_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchOutlookCalendarEventCreatedRealtimeToken,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: OutlookCalendarEventCreatedFormValues) => {
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
        <OutlookCalendarEventCreatedDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseTriggerNode
          {...props}
          id={props.id}
          icon="/logos/outlook.svg"
          name="Outlook Calendar: Event Created"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

OutlookCalendarEventCreatedNode.displayName = "OutlookCalendarEventCreatedNode";
