"use client";

import { memo, useMemo, useState } from "react";
import {
  useReactFlow,
  type Node,
  type NodeProps,
  Position,
} from "@xyflow/react";
import Image from "next/image";
import { IfElseDialog, type IfElseFormValues } from "./dialog";
import { IconBranch } from "central-icons/IconBranch";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { WorkflowNode } from "@/components/workflow-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";

type IfElseNodeData = IfElseFormValues;
type IfElseNodeType = Node<IfElseNodeData>;

export const IfElseNode: React.FC<NodeProps<IfElseNodeType>> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();

  const nodeData = props.data;

  // Get the latest node data from React Flow when dialog is open
  const currentNodeData = useMemo(() => {
    if (!dialogOpen) return nodeData;
    const nodes = getNodes();
    const currentNode = nodes.find((n) => n.id === props.id);
    return (currentNode?.data as IfElseNodeData) || nodeData;
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

  const handleSubmit = (values: IfElseFormValues) => {
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

  const handleDelete = () => {
    setNodes((currentNodes) =>
      currentNodes.filter((node) => node.id !== props.id)
    );
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) => edge.source !== props.id && edge.target !== props.id
      )
    );
  };

  const getDisplayText = () => {
    if (!nodeData?.leftOperand) return "Click to configure";

    const operatorLabels: Record<string, string> = {
      equals: "=",
      notEquals: "≠",
      greaterThan: ">",
      lessThan: "<",
      greaterThanOrEqual: "≥",
      lessThanOrEqual: "≤",
      contains: "contains",
      notContains: "not contains",
      startsWith: "starts with",
      endsWith: "ends with",
      isEmpty: "is empty",
      isNotEmpty: "is not empty",
    };

    const operator = operatorLabels[nodeData.operator] || nodeData.operator;

    if (["isEmpty", "isNotEmpty"].includes(nodeData.operator)) {
      return `IF ${nodeData.leftOperand} ${operator}`;
    }

    return `IF ${nodeData.leftOperand} ${operator} ${
      nodeData.rightOperand || "..."
    }`;
  };

  return (
    <>
      <WorkflowNode
        name="IF / ELSE"
        description={getDisplayText()}
        onDelete={handleDelete}
        onSettings={() => setDialogOpen(true)}
      >
        <NodeStatusIndicator status="initial">
          <BaseNode onDoubleClick={() => setDialogOpen(true)} status="initial">
            <BaseNodeContent>
              <IconBranch className="size-3 text-gray-400" />

              {/* Input handle */}
              <BaseHandle
                id="target-1"
                type="target"
                position={Position.Left}
              />

              {/* TRUE handle (top right) */}
              <BaseHandle
                id="true"
                type="source"
                position={Position.Right}
                className="border-green-400! top-[30%]!"
              />

              {/* FALSE handle (bottom right) */}
              <BaseHandle
                id="false"
                type="source"
                position={Position.Right}
                className="border-red-400! top-[70%]!"
              />
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>
      </WorkflowNode>

      <IfElseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={currentNodeData}
        variables={variables}
      />
    </>
  );
});

IfElseNode.displayName = "IfElseNode";
