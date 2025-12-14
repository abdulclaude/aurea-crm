"use client";

import { useCallback, useMemo, useState } from "react";

import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  Background,
  Controls,
  MiniMap,
  getBezierPath,
  Panel,
  type EdgeProps,
} from "@xyflow/react";

import {
  ErrorView,
  LoadingView,
} from "@/components/react-flow/entity-components";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";

export const EditorLoading = () => {
  return <LoadingView message="Loading editor..." />;
};

export const EditorError = () => {
  return <ErrorView message="Error loading editor." />;
};

import { BaseEdge } from "@xyflow/react";
import { nodeComponents } from "@/config/node-components";
import { AddNodeButton } from "./add-node-button";
import { useSetAtom } from "jotai";
import { editorAtom } from "../store/atoms";
import { NodeType } from "@prisma/client";
import { ExecuteWorkflowButton } from "./execute-workflow-button";
import { WorkflowContextProvider } from "../store/workflow-context";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { getExampleContextForNodeType } from "@/features/workflows/lib/build-node-context";

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceHandleId,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  // Determine edge label based on sourceHandleId
  let label = "";
  let labelBgColor = "";
  let labelTextColor = "";
  let labelBorderColor = "";
  let labelTextSize = "";

  if (sourceHandleId === "true") {
    label = "TRUE";
    labelBgColor = "rgb(34 197 94)"; // bg-green-500
    labelTextColor = "rgb(255 255 255)"; // text-white
    labelBorderColor = "rgb(22 163 74)"; // border-green-600
    labelTextSize = "6px";
  } else if (sourceHandleId === "false") {
    label = "FALSE";
    labelBgColor = "rgb(239 68 68)"; // bg-red-500
    labelTextColor = "rgb(255 255 255)"; // text-white
    labelBorderColor = "rgb(220 38 38)"; // border-red-600
    labelTextSize = "6px";
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      {label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          {/* Border/shadow effect */}
          <rect
            x={-20}
            y={-8}
            width={40}
            height={16}
            rx={4}
            fill={labelBorderColor}
            opacity={0.2}
          />
          {/* Main background */}
          <rect
            x={-19}
            y={-7}
            width={38}
            height={14}
            rx={3}
            fill={labelBgColor}
          />
          {/* Text */}
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: labelTextSize,
              fontWeight: 700,
              fill: labelTextColor,
              letterSpacing: "0.5px",
            }}
          >
            {label}
          </text>
        </g>
      )}
    </>
  );
}

const edgeTypes = {
  "custom-edge": CustomEdge,
};

const initialEdges = [
  {
    id: "n1-n2",
    source: "n1",
    target: "n2",
    type: "custom-edge",
  },
];

export const Editor = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);

  const [nodes, setNodes] = useState<Node[]>(workflow.nodes);
  const [edges, setEdges] = useState<Edge[]>(
    workflow.edges.map((edge) => ({
      ...edge,
      type: "custom-edge",
    }))
  );

  const isBundle = workflow.isBundle ?? false;

  // Fetch parent workflows if this is a bundle
  const trpc = useTRPC();
  const { data: parentWorkflows } = useQuery({
    ...trpc.workflows.getParentWorkflows.queryOptions({
      bundleId: workflowId,
    }),
    enabled: isBundle,
  });

  // Build parent workflow context for bundles
  const parentWorkflowContext = useMemo(() => {
    if (!isBundle || !parentWorkflows || parentWorkflows.length === 0) {
      return undefined;
    }

    // Build context from all parent workflows
    // We need to build RAW context objects, not VariableItem[]
    const contexts: Record<string, Record<string, any>> = {};

    for (const parentWf of parentWorkflows) {
      // Find the bundle workflow node in this parent
      const bundleNode = parentWf.Node.find((n: any) => {
        if (n.type !== NodeType.BUNDLE_WORKFLOW) return false;
        const data = n.data as Record<string, any>;
        return data?.bundleWorkflowId === workflowId;
      });

      if (!bundleNode) continue;

      // Find all nodes BEFORE the bundle node
      const upstreamNodeIds = new Set<string>();
      const queue: string[] = [bundleNode.id];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const incomingEdges = parentWf.Connection.filter(
          (e: any) => e.toNodeId === nodeId
        );
        for (const edge of incomingEdges) {
          upstreamNodeIds.add(edge.fromNodeId);
          queue.push(edge.fromNodeId);
        }
      }

      // Build raw context object from upstream nodes
      const workflowContext: Record<string, any> = {};

      for (const nodeId of upstreamNodeIds) {
        const node = parentWf.Node.find((n: any) => n.id === nodeId);
        if (!node) continue;

        const nodeData = node.data as any;
        const variableName = nodeData?.variableName;
        if (!variableName) continue;

        // Get example context for this node type
        const exampleContext = getExampleContextForNodeType(
          node.type,
          nodeData
        );
        if (exampleContext) {
          workflowContext[variableName] = exampleContext;
        }
      }

      // Only add workflow if it has variables
      if (Object.keys(workflowContext).length > 0) {
        contexts[parentWf.name] = workflowContext;
      }
    }

    return Object.keys(contexts).length > 0 ? contexts : undefined;
  }, [isBundle, parentWorkflows, workflowId]);

  const onNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    setNodes((nodesSnapshot) => {
      const updatedNodes = applyNodeChanges(changes, nodesSnapshot);

      // If all nodes are deleted, add back the INITIAL placeholder node
      if (updatedNodes.length === 0) {
        return [
          {
            id: "initial",
            type: NodeType.INITIAL,
            position: { x: 0, y: 0 },
            data: {},
          },
        ];
      }

      return updatedNodes;
    });
  }, []);
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((edgesSnapshot) =>
        addEdge({ ...params, type: "custom-edge" }, edgesSnapshot)
      ),
    []
  );

  const setEditor = useSetAtom(editorAtom);

  const hasManualTrigger = useMemo(() => {
    return nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER);
  }, [nodes]);

  return (
    <WorkflowContextProvider
      value={{
        isBundle,
        bundleInputs: (workflow as any).bundleInputs as
          | Array<{
              name: string;
              type: string;
              description?: string;
              defaultValue?: unknown;
            }>
          | undefined,
        workflowName: workflow.name,
        parentWorkflowContext,
      }}
    >
      <div className="size-full bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeComponents}
          onInit={setEditor}
          fitView
          snapGrid={[10, 10]}
          snapToGrid
          panOnScroll
          panOnDrag={false}
          selectionOnDrag
          proOptions={{
            hideAttribution: true,
          }}
        >
          <Background />
          <Controls showInteractive={false} />
          <Panel position="top-right">
            <AddNodeButton isBundle={isBundle} />
          </Panel>

          {hasManualTrigger && (
            <Panel position="bottom-center">
              <ExecuteWorkflowButton workflowId={workflowId} />
            </Panel>
          )}
        </ReactFlow>
      </div>
    </WorkflowContextProvider>
  );
};
