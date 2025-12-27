"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import { OnedriveFileUpdatedDialog, type OnedriveFileUpdatedFormValues } from "./dialog";

import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/onedrive.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { ONEDRIVE_FILE_UPDATED_CHANNEL_NAME } from "@/inngest/channels/onedrive-file-updated";
import { fetchOnedriveFileUpdatedRealtimeToken } from "./actions";

type OnedriveFileUpdatedNodeData = OnedriveFileUpdatedFormValues;

type OnedriveFileUpdatedNodeType = Node<OnedriveFileUpdatedNodeData>;

export const OnedriveFileUpdatedNode: React.FC<NodeProps<OnedriveFileUpdatedNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: ONEDRIVE_FILE_UPDATED_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchOnedriveFileUpdatedRealtimeToken,
    });

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as OnedriveFileUpdatedNodeData) || nodeData;
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

    const description = "Triggers when a file is updated";


    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: OnedriveFileUpdatedFormValues) => {
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
        <OnedriveFileUpdatedDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseTriggerNode
          {...props}
          id={props.id}
          icon="/logos/onedrive.svg"
          name="OneDrive: File Updated"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

OnedriveFileUpdatedNode.displayName = "OnedriveFileUpdatedNode";
