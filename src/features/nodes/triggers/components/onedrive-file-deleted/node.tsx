"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import { OnedriveFileDeletedDialog, type OnedriveFileDeletedFormValues } from "./dialog";

import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/onedrive.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { ONEDRIVE_FILE_DELETED_CHANNEL_NAME } from "@/inngest/channels/onedrive-file-deleted";
import { fetchOnedriveFileDeletedRealtimeToken } from "./actions";

type OnedriveFileDeletedNodeData = OnedriveFileDeletedFormValues;

type OnedriveFileDeletedNodeType = Node<OnedriveFileDeletedNodeData>;

export const OnedriveFileDeletedNode: React.FC<NodeProps<OnedriveFileDeletedNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: ONEDRIVE_FILE_DELETED_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchOnedriveFileDeletedRealtimeToken,
    });

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as OnedriveFileDeletedNodeData) || nodeData;
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

    const description = "Triggers when a file is deleted";


    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: OnedriveFileDeletedFormValues) => {
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
        <OnedriveFileDeletedDialog
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
          name="OneDrive: File Deleted"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

OnedriveFileDeletedNode.displayName = "OnedriveFileDeletedNode";
