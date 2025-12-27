"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { ExecuteWorkflowDialog, type ExecuteWorkflowFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchExecuteWorkflowRealtimeToken } from "./actions";
import { EXECUTE_WORKFLOW_CHANNEL_NAME } from "@/inngest/channels/execute-workflow";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { IconPlay as WorkflowIcon } from "central-icons/IconPlay";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type ExecuteWorkflowNodeData = ExecuteWorkflowFormValues;

type ExecuteWorkflowNodeType = Node<ExecuteWorkflowNodeData>;

export const ExecuteWorkflowNode: React.FC<NodeProps<ExecuteWorkflowNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as ExecuteWorkflowNodeData) || nodeData;
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

    const description = "Execute another workflow";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: EXECUTE_WORKFLOW_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchExecuteWorkflowRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: ExecuteWorkflowFormValues) => {
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
        <ExecuteWorkflowDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={WorkflowIcon}
          name="Execute Workflow"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

ExecuteWorkflowNode.displayName = "ExecuteWorkflowNode";
