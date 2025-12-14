"use client";

import { memo, useMemo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import {
  FindContactsDialog,
  type FindContactsFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchFindContactsRealtimeToken } from "./actions";
import { FIND_CONTACTS_CHANNEL_NAME } from "@/inngest/channels/find-contacts";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { Search } from "lucide-react";

type FindContactsNodeData = Partial<FindContactsFormValues>;
type FindContactsNodeType = Node<FindContactsNodeData>;

export const FindContactsNode: React.FC<NodeProps<FindContactsNodeType>> =
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
      channel: FIND_CONTACTS_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchFindContactsRealtimeToken as any,
    });

    const handleSubmit = (values: FindContactsFormValues) => {
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
        <FindContactsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={data}
          variables={variables}
        />

        <BaseExecutionNode
          {...props}
          icon={Search}
          name="Find contacts"
          description={description}
          status={nodeStatus}
          onSettings={() => setDialogOpen(true)}
          onDoubleClick={() => setDialogOpen(true)}
        />
      </>
    );
  });

FindContactsNode.displayName = "FindContactsNode";
