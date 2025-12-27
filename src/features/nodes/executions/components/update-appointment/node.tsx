"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  UpdateAppointmentDialog,
  type UpdateAppointmentFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchUpdateAppointmentRealtimeToken } from "./actions";
import { UPDATE_APPOINTMENT_CHANNEL_NAME } from "@/inngest/channels/update-appointment";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconCalendarEdit as CalendarEditIcon } from "central-icons/IconCalendarEdit";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type UpdateAppointmentNodeData = UpdateAppointmentFormValues;

type UpdateAppointmentNodeType = Node<UpdateAppointmentNodeData>;

export const UpdateAppointmentNode: React.FC<
  NodeProps<UpdateAppointmentNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();

  const nodeData = props.data;

  const currentNodeData = useMemo(() => {
    if (!dialogOpen) return nodeData;
    const nodes = getNodes();
    const currentNode = nodes.find((n) => n.id === props.id);
    return (currentNode?.data as UpdateAppointmentNodeData) || nodeData;
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

  const description = "Update an existing appointment";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: UPDATE_APPOINTMENT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchUpdateAppointmentRealtimeToken as any,
  });

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: UpdateAppointmentFormValues) => {
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
      <UpdateAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={currentNodeData}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={CalendarEditIcon}
        name="Update Appointment"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

UpdateAppointmentNode.displayName = "UpdateAppointmentNode";
