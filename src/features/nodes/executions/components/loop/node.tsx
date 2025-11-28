"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps, Position } from "@xyflow/react";
import { LoopDialog, type LoopFormValues } from "./dialog";
import { IconRepeat } from "central-icons/IconRepeat";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { WorkflowNode } from "@/components/workflow-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";

type LoopNodeData = LoopFormValues;
type LoopNodeType = Node<LoopNodeData>;

export const LoopNode: React.FC<NodeProps<LoopNodeType>> = memo(
  (props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    // Get the latest node data from React Flow when dialog is open
    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as LoopNodeData) || nodeData;
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

    const handleSubmit = (values: LoopFormValues) => {
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
      if (!nodeData?.loopType) return "Click to configure";

      if (nodeData.loopType === "array") {
        return `LOOP over ${nodeData.arrayInput || "array"}`;
      } else {
        return `LOOP ${nodeData.countInput || "N"} times`;
      }
    };

    return (
      <>
        <WorkflowNode
          name="LOOP"
          description={getDisplayText()}
          onDelete={handleDelete}
          onSettings={() => setDialogOpen(true)}
        >
          <NodeStatusIndicator status="initial">
            <BaseNode
              onDoubleClick={() => setDialogOpen(true)}
              status="initial"
            >
              <BaseNodeContent>
                <IconRepeat className="size-3 text-gray-400" />

                {/* Input handle */}
                <BaseHandle
                  id="target-1"
                  type="target"
                  position={Position.Left}
                />

                {/* Loop body handle (top right) */}
                <BaseHandle
                  id="loop-body"
                  type="source"
                  position={Position.Right}
                  className="!border-purple-400 !top-[30%]"
                />

                {/* After loop handle (bottom right) */}
                <BaseHandle
                  id="after-loop"
                  type="source"
                  position={Position.Right}
                  className="!border-green-400 !top-[70%]"
                />

                {/* Loop back handle (for connecting back to loop body) */}
                <BaseHandle
                  id="loop-back"
                  type="target"
                  position={Position.Bottom}
                  className="!border-purple-400"
                />
              </BaseNodeContent>
            </BaseNode>
          </NodeStatusIndicator>
        </WorkflowNode>

        <LoopDialog
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

LoopNode.displayName = "LoopNode";
