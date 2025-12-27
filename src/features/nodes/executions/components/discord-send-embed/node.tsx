"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { DiscordSendEmbedDialog, type DiscordSendEmbedFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchDiscordSendEmbedRealtimeToken } from "./actions";
import { DISCORD_SEND_EMBED_CHANNEL_NAME } from "@/inngest/channels/discord-send-embed";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/discord.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type DiscordSendEmbedNodeData = DiscordSendEmbedFormValues;

type DiscordSendEmbedNodeType = Node<DiscordSendEmbedNodeData>;

export const DiscordSendEmbedNode: React.FC<NodeProps<DiscordSendEmbedNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as DiscordSendEmbedNodeData) || nodeData;
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

    const description = "Send an embed message to Discord";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: DISCORD_SEND_EMBED_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchDiscordSendEmbedRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: DiscordSendEmbedFormValues) => {
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
        <DiscordSendEmbedDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={currentNodeData}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/discord.svg"
          name="Discord: Send Embed"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

DiscordSendEmbedNode.displayName = "DiscordSendEmbedNode";
