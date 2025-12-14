"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GoogleDriveDeleteFileDialog,
  type GoogleDriveDeleteFileFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGoogleDriveDeleteFileRealtimeToken } from "./actions";
import { GOOGLE_DRIVE_DELETE_FILE_CHANNEL_NAME } from "@/inngest/channels/google-drive-delete-file";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GoogleDriveDeleteFileNodeData = Partial<GoogleDriveDeleteFileFormValues>;
type GoogleDriveDeleteFileNodeType = Node<GoogleDriveDeleteFileNodeData>;

export const GoogleDriveDeleteFileNode: React.FC<
  NodeProps<GoogleDriveDeleteFileNodeType>
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
    ? `Delete file`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_DRIVE_DELETE_FILE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleDriveDeleteFileRealtimeToken as any,
  });

  const handleSubmit = (values: GoogleDriveDeleteFileFormValues) => {
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
      <GoogleDriveDeleteFileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/googledrive.svg"
        name="Google Drive delete file"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GoogleDriveDeleteFileNode.displayName = "GoogleDriveDeleteFileNode";
