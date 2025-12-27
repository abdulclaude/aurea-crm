"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import { SlackMessageReactionDialog, type SlackMessageReactionFormValues } from "./dialog";

import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/slack.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { SLACK_MESSAGE_REACTION_CHANNEL_NAME } from "@/inngest/channels/slack-message-reaction";
import { fetchSlackMessageReactionRealtimeToken } from "./actions";

type SlackMessageReactionNodeData = SlackMessageReactionFormValues;

type SlackMessageReactionNodeType = Node<SlackMessageReactionNodeData>;

export const SlackMessageReactionNode: React.FC<NodeProps<SlackMessageReactionNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: SLACK_MESSAGE_REACTION_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchSlackMessageReactionRealtimeToken,
    });

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as SlackMessageReactionNodeData) || nodeData;
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

    const description = "Triggers when a reaction is added to a message";


    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: SlackMessageReactionFormValues) => {
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
        <SlackMessageReactionDialog
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
          name="Slack: Message Reaction"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

SlackMessageReactionNode.displayName = "SlackMessageReactionNode";
