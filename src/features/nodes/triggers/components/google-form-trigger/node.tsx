"use client";

import type { NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../../base-trigger-node";

import { GoogleFormTriggerDialog, type GoogleFormTriggerFormValues } from "./dialog";

import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { GOOGLE_FORM_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/google-form-trigger";
import { fetchGoogleFormTriggerRealtimeToken } from "./actions";
import { useReactFlow } from "@xyflow/react";
import { updateVariableReferences } from "@/features/workflows/lib/update-variable-references";
import { toast } from "sonner";

type GoogleFormTriggerNodeData = GoogleFormTriggerFormValues;

export const GoogleFormNode: React.FC<NodeProps> = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, getNodes, getEdges } = useReactFlow();

  const nodeData = props.data as GoogleFormTriggerNodeData | undefined;

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_FORM_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleFormTriggerRealtimeToken,
  });

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: GoogleFormTriggerFormValues) => {
    const oldVariableName = nodeData?.variableName;
    const newVariableName = values.variableName;

    setNodes((nodes) => {
      // First, update this node's data
      const updatedNodes = nodes.map((node) => {
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
      });

      // If variable name changed, update references in downstream nodes
      if (oldVariableName && oldVariableName !== newVariableName) {
        const edges = getEdges();
        const finalNodes = updateVariableReferences(
          props.id,
          oldVariableName,
          newVariableName,
          updatedNodes,
          edges
        );

        // Show toast notification
        toast.success(
          `Variable name updated from "${oldVariableName}" to "${newVariableName}". All references in downstream nodes have been automatically updated.`
        );

        return finalNodes;
      }

      return updatedNodes;
    });
  };

  return (
    <>
      <GoogleFormTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
        variables={[]}
      />
      <BaseTriggerNode
        {...props}
        icon="/logos/googleform.svg"
        name="When a Google Form is submitted"
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});
