"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  getSmoothStepPath,
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
import { NodeType } from "@/db/enums";
import { ExecuteWorkflowButton } from "./execute-workflow-button";
import { WorkflowContextProvider } from "../store/workflow-context";
import { WorkflowRealtimeProvider } from "../store/workflow-realtime-context";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { getExampleContextForNodeType } from "@/features/workflows/lib/build-node-context";
import { isWorkflowTriggerNodeType } from "@/features/workflows/lib/workflow-node-types";
import { readWorkflowDraft } from "../lib/workflow-editor-draft";
import { WorkflowAutosave } from "./workflow-autosave";

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
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    offset: 28,
    borderRadius: 8,
  });

  const label =
    sourceHandleId === "true"
      ? "True"
      : sourceHandleId === "false"
        ? "False"
        : "";

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      {label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <foreignObject x={-22} y={-10} width={44} height={20}>
            <div
              className={
                label === "True"
                  ? "flex size-full items-center justify-center rounded-full border border-emerald-600/50 bg-emerald-100 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300"
                  : "flex size-full items-center justify-center rounded-full border border-rose-600/50 bg-rose-100 text-[9px] font-semibold text-rose-700 dark:text-rose-300"
              }
            >
              {label}
            </div>
          </foreignObject>
        </g>
      )}
    </>
  );
}

const edgeTypes = {
  "custom-edge": CustomEdge,
};

function humanizeNodeType(type?: string) {
  if (!type) return "Unconfigured node";
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getNodeLabel(node: Node) {
  const label = node.data.label;
  if (typeof label === "string" && label.trim()) return label;

  const name = node.data.name;
  if (typeof name === "string" && name.trim()) return name;

  return humanizeNodeType(node.type);
}

function WorkflowSummaryPanel({ nodes }: { nodes: Node[] }) {
  const configuredNodes = nodes.filter(
    (node) => node.type !== NodeType.INITIAL,
  );
  const trigger = configuredNodes.find((node) =>
    isWorkflowTriggerNodeType(node.type),
  );
  const actions = configuredNodes.filter((node) => node.id !== trigger?.id);

  return (
    <div className="hidden w-64 overflow-hidden rounded-lg border border-black/10 bg-background/95 shadow-sm backdrop-blur dark:border-white/10 md:block">
      <div className="px-4 py-3">
        <p className="text-[10px] font-medium uppercase text-primary/40">
          Workflow summary
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-primary">
            {configuredNodes.length}{" "}
            {configuredNodes.length === 1 ? "node" : "nodes"}
          </span>
          <span className="rounded-md bg-primary-foreground/40 px-2 py-1 text-[10px] text-primary/55">
            {actions.length} {actions.length === 1 ? "action" : "actions"}
          </span>
        </div>
      </div>
      <div className="border-t border-black/5 dark:border-white/5">
        <div className="px-4 py-3">
          <p className="text-[10px] text-primary/40">Trigger</p>
          <p className="mt-1 truncate text-xs font-medium text-primary">
            {trigger ? getNodeLabel(trigger) : "Add a trigger to start this workflow"}
          </p>
        </div>
        {actions.length > 0 ? (
          <div className="border-t border-black/5 px-4 py-3 dark:border-white/5">
            <p className="mb-2 text-[10px] text-primary/40">Actions</p>
            <div className="space-y-2">
              {actions.slice(0, 4).map((node, index) => (
                <div key={node.id} className="flex min-w-0 items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-black/10 bg-primary-foreground/20 text-[9px] text-primary/55 dark:border-white/10">
                    {index + 1}
                  </span>
                  <span className="truncate text-[11px] text-primary/70">
                    {getNodeLabel(node)}
                  </span>
                </div>
              ))}
              {actions.length > 4 ? (
                <p className="pl-7 text-[10px] text-primary/40">
                  +{actions.length - 4} more
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const Editor = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);

  const [nodes, setNodes] = useState<Node[]>(workflow.nodes);
  const [edges, setEdges] = useState<Edge[]>(
    workflow.edges.map((edge) => ({
      ...edge,
      type: "custom-edge",
    }))
  );
  const [draftChecked, setDraftChecked] = useState(false);
  const restoredWorkflowIdRef = useRef<string | null>(null);

  const initialEdges = useMemo(
    () =>
      workflow.edges.map((edge) => ({
        ...edge,
        type: "custom-edge",
      })),
    [workflow.edges],
  );

  useEffect(() => {
    if (restoredWorkflowIdRef.current === workflowId) return;
    restoredWorkflowIdRef.current = workflowId;
    const draft = readWorkflowDraft(
      workflowId,
      workflow.updatedAt.toISOString(),
    );
    setNodes(draft?.nodes ?? workflow.nodes);
    setEdges(draft?.edges ?? initialEdges);
    setDraftChecked(true);
  }, [initialEdges, workflow.nodes, workflow.updatedAt, workflowId]);

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
    (params: Connection) => {
      const sourceNode = nodes.find((node) => node.id === params.source);
      const targetNode = nodes.find((node) => node.id === params.target);
      const isConditionBranch =
        sourceNode?.type === NodeType.IF_ELSE &&
        params.sourceHandle === "branch" &&
        targetNode;
      const sourceHandle = isConditionBranch
        ? targetNode.position.x < sourceNode.position.x
          ? "false"
          : "true"
        : params.sourceHandle;

      setEdges((edgesSnapshot) =>
        addEdge(
          { ...params, sourceHandle, type: "custom-edge" },
          edgesSnapshot,
        ),
      );
    },
    [nodes],
  );

  const setEditor = useSetAtom(editorAtom);

  const hasManualTrigger = useMemo(() => {
    return nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER);
  }, [nodes]);

  const workflowContextValue = useMemo(
    () => ({
      isBundle,
      bundleInputs: workflow.bundleInputs,
      workflowName: workflow.name,
      parentWorkflowContext,
    }),
    [
      isBundle,
      parentWorkflowContext,
      workflow.bundleInputs,
      workflow.name,
    ],
  );

  return (
    <WorkflowContextProvider value={workflowContextValue}>
      <WorkflowRealtimeProvider>
        <div className="size-full bg-[#f7f8fa] dark:bg-[#101416]">
          {draftChecked ? (
            <WorkflowAutosave
              workflowId={workflowId}
              baseUpdatedAt={workflow.updatedAt.toISOString()}
              initialNodes={workflow.nodes}
              initialEdges={initialEdges}
              nodes={nodes}
              edges={edges}
            />
          ) : null}
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
            fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
            snapGrid={[10, 10]}
            snapToGrid
            panOnScroll
            panOnDrag={false}
            selectionOnDrag
            proOptions={{
              hideAttribution: true,
            }}
          >
            <Background gap={18} size={1} color="rgba(100,116,139,0.22)" />
            <Controls
              showInteractive={false}
              className="overflow-hidden rounded-lg border border-black/10 bg-background shadow-sm dark:border-white/10"
            />
            <Panel position="top-left" className="m-3">
              <WorkflowSummaryPanel nodes={nodes} />
            </Panel>
            <Panel position="top-right" className="m-3">
              <AddNodeButton isBundle={isBundle} />
            </Panel>

            {hasManualTrigger && (
              <Panel position="bottom-center">
                <ExecuteWorkflowButton workflowId={workflowId} />
              </Panel>
            )}
          </ReactFlow>
        </div>
      </WorkflowRealtimeProvider>
    </WorkflowContextProvider>
  );
};
