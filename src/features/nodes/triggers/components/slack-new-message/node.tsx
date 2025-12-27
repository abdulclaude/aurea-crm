"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import { SlackNewMessageDialog, type SlackNewMessageFormValues } from "./dialog";

import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/slack.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { SLACK_NEW_MESSAGE_CHANNEL_NAME } from "@/inngest/channels/slack-new-message";
import { fetchSlackNewMessageRealtimeToken } from "./actions";

type SlackNewMessageNodeData = SlackNewMessageFormValues;

type SlackNewMessageNodeType = Node<SlackNewMessageNodeData>;

export const SlackNewMessageNode: React.FC<NodeProps<SlackNewMessageNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: SLACK_NEW_MESSAGE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchSlackNewMessageRealtimeToken,
    });

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as SlackNewMessageNodeData) || nodeData;
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

    const description = "Triggers when a new Slack message is posted";


    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: SlackNewMessageFormValues) => {
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
        <SlackNewMessageDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseTriggerNode
          {...props}
          id={props.id}
          icon="/logos/slack.svg"
          name="Slack: New Message"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

SlackNewMessageNode.displayName = "SlackNewMessageNode";
