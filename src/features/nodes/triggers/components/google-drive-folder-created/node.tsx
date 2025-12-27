"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import { GoogleDriveFolderCreatedDialog, type GoogleDriveFolderCreatedFormValues } from "./dialog";

import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/googledrive.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { GOOGLE_DRIVE_FOLDER_CREATED_CHANNEL_NAME } from "@/inngest/channels/google-drive-folder-created";
import { fetchGoogleDriveFolderCreatedRealtimeToken } from "./actions";

type GoogleDriveFolderCreatedNodeData = GoogleDriveFolderCreatedFormValues;

type GoogleDriveFolderCreatedNodeType = Node<GoogleDriveFolderCreatedNodeData>;

export const GoogleDriveFolderCreatedNode: React.FC<NodeProps<GoogleDriveFolderCreatedNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as GoogleDriveFolderCreatedNodeData) || nodeData;
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

    const description = "Triggers when a folder is created in Google Drive";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: GOOGLE_DRIVE_FOLDER_CREATED_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchGoogleDriveFolderCreatedRealtimeToken,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GoogleDriveFolderCreatedFormValues) => {
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
        <GoogleDriveFolderCreatedDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseTriggerNode
          {...props}
          id={props.id}
          icon="/logos/googledrive.svg"
          name="Google Drive: Folder Created"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

GoogleDriveFolderCreatedNode.displayName = "GoogleDriveFolderCreatedNode";
