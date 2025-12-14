"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GoogleDriveDownloadFileDialog,
  type GoogleDriveDownloadFileFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGoogleDriveDownloadFileRealtimeToken } from "./actions";
import { GOOGLE_DRIVE_DOWNLOAD_FILE_CHANNEL_NAME } from "@/inngest/channels/google-drive-download-file";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GoogleDriveDownloadFileNodeData = Partial<GoogleDriveDownloadFileFormValues>;
type GoogleDriveDownloadFileNodeType = Node<GoogleDriveDownloadFileNodeData>;

export const GoogleDriveDownloadFileNode: React.FC<
  NodeProps<GoogleDriveDownloadFileNodeType>
> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const workflowContext = useWorkflowContext();

  const data = props.data || {};

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

  const description = data.fileId
    ? `File ID: ${data.fileId.substring(0, 20)}${data.fileId.length > 20 ? "..." : ""}`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_DRIVE_DOWNLOAD_FILE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleDriveDownloadFileRealtimeToken as any,
  });

  const handleSubmit = (values: GoogleDriveDownloadFileFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...values,
              },
            }
          : node
      )
    );
  };

  return (
    <>
      <GoogleDriveDownloadFileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/googledrive.svg"
        name="Google Drive download file"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GoogleDriveDownloadFileNode.displayName = "GoogleDriveDownloadFileNode";
