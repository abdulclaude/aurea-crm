"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "../../base-execution-node";
import { BundleWorkflowDialog, type BundleWorkflowFormValues } from "./dialog";
import { IconImagineAi } from "central-icons/IconImagineAi";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { BUNDLE_WORKFLOW_CHANNEL_NAME } from "@/inngest/channels/bundle-workflow";
import { fetchBundleWorkflowRealtimeToken } from "./actions";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type BundleWorkflowNodeData = Partial<BundleWorkflowFormValues>;
type BundleWorkflowNodeType = Node<BundleWorkflowNodeData>;

export const BundleWorkflowNode: React.FC<NodeProps<BundleWorkflowNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const data = props.data || {};

    // Get the latest node data from React Flow when dialog is open
    const currentData = useMemo(() => {
      if (!dialogOpen) return data;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as BundleWorkflowNodeData) || data;
    }, [dialogOpen, getNodes, props.id, data]);

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

    const description = data.bundleWorkflowId
      ? `Bundle: ${data.variableName || "Not named"}`
      : "Not configured";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: BUNDLE_WORKFLOW_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchBundleWorkflowRealtimeToken,
    });

    const handleSubmit = (values: BundleWorkflowFormValues) => {
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

    const handleOpen = () => setDialogOpen(true);

    return (
      <>
        <BundleWorkflowDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSubmit}
          initialData={currentData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          icon={IconImagineAi}
          name="Bundle Workflow"
          description={description}
          status={nodeStatus}
          onSettings={handleOpen}
          onDoubleClick={handleOpen}
        />
      </>
    );
  });
