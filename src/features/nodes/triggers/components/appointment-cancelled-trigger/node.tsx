"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import { AppointmentCancelledTriggerDialog, type AppointmentCancelledTriggerFormValues } from "./dialog";

import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconCalendarRemove4 as CalendarXIcon } from "central-icons/IconCalendarRemove4";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { APPOINTMENT_CANCELLED_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/appointment-cancelled-trigger";
import { fetchAppointmentCancelledTriggerRealtimeToken } from "./actions";

type AppointmentCancelledTriggerNodeData = AppointmentCancelledTriggerFormValues;

type AppointmentCancelledTriggerNodeType = Node<AppointmentCancelledTriggerNodeData>;

export const AppointmentCancelledTriggerNode: React.FC<NodeProps<AppointmentCancelledTriggerNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as AppointmentCancelledTriggerNodeData) || nodeData;
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

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: APPOINTMENT_CANCELLED_TRIGGER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchAppointmentCancelledTriggerRealtimeToken,
    });

    const description = "Triggers when an appointment is cancelled";


    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: AppointmentCancelledTriggerFormValues) => {
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
        <AppointmentCancelledTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseTriggerNode
          {...props}
          id={props.id}
          icon={CalendarXIcon}
          name="Appointment Cancelled"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

AppointmentCancelledTriggerNode.displayName = "AppointmentCancelledTriggerNode";
