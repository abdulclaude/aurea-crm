"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { ListTodo } from "lucide-react";
import { memo, useMemo, useState } from "react";

import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { CREATE_TASK_CHANNEL_NAME } from "@/inngest/channels/create-task";

import { fetchCreateTaskRealtimeToken } from "./actions";
import type { CreateTaskFormValues } from "./config";
import { CreateTaskDialog } from "./dialog";

type CreateTaskNodeType = Node<Partial<CreateTaskFormValues>>;

export const CreateTaskNode = memo((props: NodeProps<CreateTaskNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();
  const status = useNodeStatus({
    nodeId: props.id,
    channel: CREATE_TASK_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchCreateTaskRealtimeToken,
  });
  const variables = useMemo(
    () =>
      dialogOpen
        ? buildNodeContext(props.id, getNodes(), getEdges(), {
            isBundle: workflowContext.isBundle,
            bundleInputs: workflowContext.bundleInputs,
            bundleWorkflowName: workflowContext.workflowName,
            parentWorkflowContext: workflowContext.parentWorkflowContext,
          })
        : [],
    [dialogOpen, getEdges, getNodes, props.id, workflowContext],
  );

  const handleSubmit = (values: CreateTaskFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...values } }
          : node,
      ),
    );
  };

  return (
    <>
      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={props.data}
        variables={variables}
        onSubmit={handleSubmit}
      />
      <BaseExecutionNode
        {...props}
        icon={ListTodo}
        name="Create task"
        description={props.data.title || "Configure CRM follow-up"}
        status={status}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

CreateTaskNode.displayName = "CreateTaskNode";
