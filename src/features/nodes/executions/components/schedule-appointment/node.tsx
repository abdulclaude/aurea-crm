"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  ScheduleAppointmentDialog,
  type ScheduleAppointmentFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchScheduleAppointmentRealtimeToken } from "./actions";
import { SCHEDULE_APPOINTMENT_CHANNEL_NAME } from "@/inngest/channels/schedule-appointment";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconCalendarDays as ScheduleIcon } from "central-icons/IconCalendarDays";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type ScheduleAppointmentNodeData = ScheduleAppointmentFormValues;

type ScheduleAppointmentNodeType = Node<ScheduleAppointmentNodeData>;

export const ScheduleAppointmentNode: React.FC<
  NodeProps<ScheduleAppointmentNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();

  const nodeData = props.data;

  const currentNodeData = useMemo(() => {
    if (!dialogOpen) return nodeData;
    const nodes = getNodes();
    const currentNode = nodes.find((n) => n.id === props.id);
    return (currentNode?.data as ScheduleAppointmentNodeData) || nodeData;
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

  const description = "Schedule a new appointment";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SCHEDULE_APPOINTMENT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchScheduleAppointmentRealtimeToken as any,
  });

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: ScheduleAppointmentFormValues) => {
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
      <ScheduleAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={currentNodeData}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={ScheduleIcon}
        name="Schedule Appointment"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ScheduleAppointmentNode.displayName = "ScheduleAppointmentNode";
