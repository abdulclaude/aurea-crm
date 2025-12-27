"use client";

import { memo, useState, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { DiscordSendDmDialog, type DiscordSendDmFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

import { fetchDiscordSendDmRealtimeToken } from "./actions";
import { DISCORD_SEND_DM_CHANNEL_NAME } from "@/inngest/channels/discord-send-dm";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
// Icon will be loaded from /logos/discord.svg
import { useWorkflowContext } from "@/features/editor/store/workflow-context";

type DiscordSendDmNodeData = DiscordSendDmFormValues;

type DiscordSendDmNodeType = Node<DiscordSendDmNodeData>;

export const DiscordSendDmNode: React.FC<NodeProps<DiscordSendDmNodeType>> =
  memo((props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const nodeData = props.data;

    const currentNodeData = useMemo(() => {
      if (!dialogOpen) return nodeData;
      const nodes = getNodes();
      const currentNode = nodes.find((n) => n.id === props.id);
      return (currentNode?.data as DiscordSendDmNodeData) || nodeData;
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

    const description = "Send a direct message in Discord";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: DISCORD_SEND_DM_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchDiscordSendDmRealtimeToken as any,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: DiscordSendDmFormValues) => {
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
        <DiscordSendDmDialog
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
          name="Discord: Send DM"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  });

DiscordSendDmNode.displayName = "DiscordSendDmNode";
