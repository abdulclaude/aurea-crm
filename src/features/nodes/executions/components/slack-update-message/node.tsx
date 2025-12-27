"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { SlackUpdateMessageDialog, type SlackUpdateMessageFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchSlackUpdateMessageRealtimeToken } from "./actions";
import { SLACK_UPDATE_MESSAGE_CHANNEL_NAME } from "@/inngest/channels/slack-update-message";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/slack.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type SlackUpdateMessageNodeData = SlackUpdateMessageFormValues;

type SlackUpdateMessageNodeType = Node<SlackUpdateMessageNodeData>;

export const SlackUpdateMessageNode: React.FC<NodeProps<SlackUpdateMessageNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as SlackUpdateMessageNodeData) || nodeData;
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

    const description = "Update an existing Slack message";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: SLACK_UPDATE_MESSAGE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchSlackUpdateMessageRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: SlackUpdateMessageFormValues) => {
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
        <SlackUpdateMessageDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/slack.svg"
          name="Slack: Update Message"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

SlackUpdateMessageNode.displayName = "SlackUpdateMessageNode";
