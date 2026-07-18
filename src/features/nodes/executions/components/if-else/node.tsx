"use client";

import { memo, useMemo, useState } from "react";
import { Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { GitBranchIcon } from "lucide-react";

import { BaseHandle } from "@/components/react-flow/base-handle";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";

import { BaseExecutionNode } from "../../base-execution-node";
import { describeIfElseConfig } from "./condition-utils";
import { IfElseDialog } from "./dialog";
import {
  normalizeIfElseConfig,
  type IfElseFormValues,
} from "./schema";

type IfElseNodeData = Partial<IfElseFormValues> & {
  leftOperand?: string;
  operator?: string;
  rightOperand?: string;
};

type IfElseNodeType = Node<IfElseNodeData>;

export const IfElseNode: React.FC<NodeProps<IfElseNodeType>> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();
  const nodeData = props.data;

  const currentNodeData = useMemo(() => {
    if (!dialogOpen) return nodeData;
    return getNodes().find((node) => node.id === props.id)?.data || nodeData;
  }, [dialogOpen, getNodes, nodeData, props.id]);

  const variables = useMemo(() => {
    if (!dialogOpen) return [];
    return buildNodeContext(props.id, getNodes(), getEdges(), {
      isBundle: workflowContext.isBundle,
      bundleInputs: workflowContext.bundleInputs,
      bundleWorkflowName: workflowContext.workflowName,
      parentWorkflowContext: workflowContext.parentWorkflowContext,
    });
  }, [dialogOpen, getEdges, getNodes, props.id, workflowContext]);

  const normalized = useMemo(() => {
    try {
      return normalizeIfElseConfig(nodeData);
    } catch {
      return null;
    }
  }, [nodeData]);

  const handleSubmit = (values: IfElseFormValues): void => {
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
      <BaseExecutionNode
        {...props}
        icon={GitBranchIcon}
        name={normalized?.actionName || "Condition"}
        description={describeIfElseConfig(nodeData)}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
        showSourceHandle={false}
      >
        <BaseHandle
          id="false"
          type="source"
          position={Position.Bottom}
          className="pointer-events-none! bottom-[-5px]! left-1/2! opacity-0!"
        />
        <BaseHandle
          id="true"
          type="source"
          position={Position.Bottom}
          className="pointer-events-none! bottom-[-5px]! left-1/2! opacity-0!"
        />
        <BaseHandle
          id="branch"
          type="source"
          position={Position.Bottom}
          className="bottom-[-5px]! left-1/2! border-primary/35! bg-background!"
        />
      </BaseExecutionNode>

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
