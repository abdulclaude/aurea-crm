"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  GoogleDriveCreateFolderDialog,
  type GoogleDriveCreateFolderFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGoogleDriveCreateFolderRealtimeToken } from "./actions";
import { GOOGLE_DRIVE_CREATE_FOLDER_CHANNEL_NAME } from "@/inngest/channels/google-drive-create-folder";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type GoogleDriveCreateFolderNodeData = Partial<GoogleDriveCreateFolderFormValues>;
type GoogleDriveCreateFolderNodeType = Node<GoogleDriveCreateFolderNodeData>;

export const GoogleDriveCreateFolderNode: React.FC<
  NodeProps<GoogleDriveCreateFolderNodeType>
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

  const description = data.folderName
    ? `Folder: ${data.folderName.slice(0, 30)}${data.folderName.length > 30 ? "..." : ""}`
    : "Not configured";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_DRIVE_CREATE_FOLDER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleDriveCreateFolderRealtimeToken as any,
  });

  const handleSubmit = (values: GoogleDriveCreateFolderFormValues) => {
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
      <GoogleDriveCreateFolderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
        variables={variables}
      />

      <BaseExecutionNode
        {...props}
        icon="/logos/googledrive.svg"
        name="Google Drive create folder"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GoogleDriveCreateFolderNode.displayName = "GoogleDriveCreateFolderNode";
