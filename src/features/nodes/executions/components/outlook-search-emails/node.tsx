"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { OutlookSearchEmailsDialog, type OutlookSearchEmailsFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchOutlookSearchEmailsRealtimeToken } from "./actions";
import { OUTLOOK_SEARCH_EMAILS_CHANNEL_NAME } from "@/inngest/channels/outlook-search-emails";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/outlook.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type OutlookSearchEmailsNodeData = OutlookSearchEmailsFormValues;

type OutlookSearchEmailsNodeType = Node<OutlookSearchEmailsNodeData>;

export const OutlookSearchEmailsNode: React.FC<NodeProps<OutlookSearchEmailsNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as OutlookSearchEmailsNodeData) || nodeData;
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

    const description = "Search emails in Outlook";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: OUTLOOK_SEARCH_EMAILS_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchOutlookSearchEmailsRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: OutlookSearchEmailsFormValues) => {
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
        <OutlookSearchEmailsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/outlook.svg"
          name="Outlook: Search Emails"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

OutlookSearchEmailsNode.displayName = "OutlookSearchEmailsNode";
