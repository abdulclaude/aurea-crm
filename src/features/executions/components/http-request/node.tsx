"use client";

import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";

import { BaseExecutionNode } from "@/features/executions/base-execution-node";
import { type HttpRequestFormValues, HttpRequestDialog } from "./dialog";

type HttpRequestNodeData = {
  variableName?: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
};

type HttpRequestNodeType = Node<HttpRequestNodeData>;

export const HttpRequestNode: React.FC<NodeProps<HttpRequestNodeType>> = memo(
  (props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeData = props.data;
    const description = nodeData?.endpoint
      ? `${nodeData.method || "GET"}: ${nodeData.endpoint}`
      : "Not configured";

    const nodeStatus = "initial";

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: HttpRequestFormValues) => {
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
        <HttpRequestDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={GlobeIcon}
          name="HTTP Request"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  }
);

HttpRequestNode.displayName = "HttpRequestNode";
