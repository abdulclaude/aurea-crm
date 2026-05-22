"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  FindClientsDialog,
  type FindClientsFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchFindClientsRealtimeToken } from "./actions";
import { FIND_CLIENTS_CHANNEL_NAME } from "@/inngest/channels/find-clients";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { Search } from "lucide-react";

type FindClientsNodeData = Partial<FindClientsFormValues>;
type FindClientsNodeType = Node<FindClientsNodeData>;

export const FindClientsNode: React.FC<NodeProps<FindClientsNodeType>> =
  memo((props) => {
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

    const description = data.email || data.name || data.companyName
      ? `Search: ${data.email || data.name || data.companyName}`
      : "Not configured";

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: FIND_CLIENTS_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchFindClientsRealtimeToken as any,
    });

    const handleSubmit = (values: FindClientsFormValues) => {
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
        <FindClientsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={data}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          icon={Search}
          name="Find clients"
          description={description}
          status={nodeStatus}
          onSettings={() => setDialogOpen(true)}
          onDoubleClick={() => setDialogOpen(true)}
        />
      </>
    );
  });

FindClientsNode.displayName = "FindClientsNode";
