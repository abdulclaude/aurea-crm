"use client";

import { memo, useMemo, useState } from "react";
import {
  useReactFlow,
  type Node,
  type NodeProps,
  Position,
} from "@xyflow/react";
import { SwitchDialog, type SwitchFormValues } from "./dialog";
import { IconArrowRightLeft as IconSwitch } from "central-icons/IconArrowRightLeft";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { WorkflowNode } from "@/components/workflow-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";

type SwitchNodeData = SwitchFormValues;
type SwitchNodeType = Node<SwitchNodeData>;

export const SwitchNode: React.FC<NodeProps<SwitchNodeType>> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();

  const nodeData = props.data;

  // Get the latest node data from React Flow when dialog is open
  const currentNodeData = useMemo(() => {
    if (!dialogOpen) return nodeData;
    const nodes = getNodes();
    const currentNode = nodes.find((n) => n.id === props.id);
    return (currentNode?.data as SwitchNodeData) || nodeData;
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

  const handleSubmit = (values: SwitchFormValues) => {
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
    if (!nodeData?.inputValue) return "Click to configure";

    const casesCount = nodeData.cases?.length || 0;
    return `SWITCH ${nodeData.inputValue} (${casesCount} cases)`;
  };

  // Calculate handle positions dynamically based on number of cases
  const cases = nodeData?.cases || [];
  const totalHandles = cases.length + 1; // cases + default
  const handleSpacing = 100 / (totalHandles + 1);

  return (
    <>
      <WorkflowNode
        name="SWITCH"
        description={getDisplayText()}
        onDelete={handleDelete}
        onSettings={() => setDialogOpen(true)}
      >
        <NodeStatusIndicator status="initial">
          <BaseNode onDoubleClick={() => setDialogOpen(true)} status="initial">
            <BaseNodeContent>
              <IconSwitch className="size-3 text-gray-400" />

              {/* Input handle */}
              <BaseHandle
                id="target-1"
                type="target"
                position={Position.Left}
              />

              {/* Case handles */}
              {cases.map((caseItem, index) => (
                <BaseHandle
                  key={`case-${index}`}
                  id={`case-${index}`}
                  type="source"
                  position={Position.Right}
                  className="!border-blue-400"
                  style={{ top: `${handleSpacing * (index + 1)}%` }}
                />
              ))}

              {/* Default handle */}
              <BaseHandle
                id="default"
                type="source"
                position={Position.Right}
                className="!border-gray-400"
                style={{ top: `${handleSpacing * (cases.length + 1)}%` }}
              />
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>
      </WorkflowNode>

      <SwitchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={currentNodeData}
        variables={variables}
      />
    </>
  );
});

SwitchNode.displayName = "SwitchNode";
