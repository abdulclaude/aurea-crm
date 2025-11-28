"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "../../base-execution-node";
import { SetVariableDialog, type SetVariableFormValues } from "./dialog";
import { IconVariables } from "central-icons/IconVariables";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type SetVariableNodeData = SetVariableFormValues;
type SetVariableNodeType = Node<SetVariableNodeData>;

export const SetVariableNode: React.FC<NodeProps<SetVariableNodeType>> = memo(
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
      return (currentNode?.data as SetVariableNodeData) || nodeData;
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

    const handleSubmit = (values: SetVariableFormValues) => {
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
      if (!nodeData?.variableName) return "Click to configure";
      const valuePreview =
        nodeData.value && nodeData.value.length > 30
          ? `${nodeData.value.substring(0, 30)}...`
          : nodeData.value || "";
      return `${nodeData.variableName} = ${valuePreview}`;
    };

    return (
      <>
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={IconVariables}
          name="Set Variable"
          description={getDisplayText()}
          onSettings={() => setDialogOpen(true)}
          onDoubleClick={() => setDialogOpen(true)}
        />

        <SetVariableDialog
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

SetVariableNode.displayName = "SetVariableNode";
