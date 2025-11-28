"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "../../base-execution-node";
import { StopWorkflowDialog, type StopWorkflowFormValues } from "./dialog";
import { IconStop } from "central-icons/IconStop";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type StopWorkflowNodeData = StopWorkflowFormValues;
type StopWorkflowNodeType = Node<StopWorkflowNodeData>;

export const StopWorkflowNode: React.FC<NodeProps<StopWorkflowNodeType>> = memo(
  (props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    // Get the latest node data from React Flow when dialog is open
    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as StopWorkflowNodeData) || nodeData;
    }, [dialogOpen, getNodes, props.id, nodeData]);

    // Build available context from upstream nodes
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

    const handleSubmit = (values: StopWorkflowFormValues) => {
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

    const getDisplayText = () => {
      if (!nodeData?.reason) return "Stops workflow execution";
      return nodeData.reason.length > 40
        ? `${nodeData.reason.substring(0, 40)}...`
        : nodeData.reason;
    };

    return (
      <>
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={IconStop}
          name="Stop Workflow"
          description={getDisplayText()}
          onSettings={() => setDialogOpen(true)}
          onDoubleClick={() => setDialogOpen(true)}
        />

        <StopWorkflowDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />
      </>
    );
  }
);

StopWorkflowNode.displayName = "StopWorkflowNode";
