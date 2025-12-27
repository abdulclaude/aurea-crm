"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { OnedriveDownloadFileDialog, type OnedriveDownloadFileFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchOnedriveDownloadFileRealtimeToken } from "./actions";
import { ONEDRIVE_DOWNLOAD_FILE_CHANNEL_NAME } from "@/inngest/channels/onedrive-download-file";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/onedrive.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type OnedriveDownloadFileNodeData = OnedriveDownloadFileFormValues;

type OnedriveDownloadFileNodeType = Node<OnedriveDownloadFileNodeData>;

export const OnedriveDownloadFileNode: React.FC<NodeProps<OnedriveDownloadFileNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as OnedriveDownloadFileNodeData) || nodeData;
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

    const description = "Download a file from OneDrive";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: ONEDRIVE_DOWNLOAD_FILE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchOnedriveDownloadFileRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: OnedriveDownloadFileFormValues) => {
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
        <OnedriveDownloadFileDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/onedrive.svg"
          name="OneDrive: Download File"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

OnedriveDownloadFileNode.displayName = "OnedriveDownloadFileNode";
