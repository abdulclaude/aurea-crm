"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GoogleDriveUploadFileDialog,
  type GoogleDriveUploadFileFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGoogleDriveUploadFileRealtimeToken } from "./actions";
import { GOOGLE_DRIVE_UPLOAD_FILE_CHANNEL_NAME } from "@/inngest/channels/google-drive-upload-file";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GoogleDriveUploadFileNodeData = Partial<GoogleDriveUploadFileFormValues>;
type GoogleDriveUploadFileNodeType = Node<GoogleDriveUploadFileNodeData>;

export const GoogleDriveUploadFileNode: React.FC<
  NodeProps<GoogleDriveUploadFileNodeType>
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

  const description = data.fileName
    ? `Upload: ${data.fileName.slice(0, 30)}${data.fileName.length > 30 ? "..." : ""}`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_DRIVE_UPLOAD_FILE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleDriveUploadFileRealtimeToken as any,
  });

  const handleSubmit = (values: GoogleDriveUploadFileFormValues) => {
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
      <GoogleDriveUploadFileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/googledrive.svg"
        name="Google Drive upload file"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GoogleDriveUploadFileNode.displayName = "GoogleDriveUploadFileNode";
