"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import { memo, useState } from "react";

import { BaseExecutionNode } from "@/features/executions/base-execution-node";
import { HttpRequestDialog } from "./dialog";

type HttpRequestNodeData = {
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
  [key: string]: unknown;
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

    const nodeStatus = "error";

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: {
      endpoint: string;
      method: string;
      body?: string;
    }) => {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === props.id) {
            return {
              ...node,
              data: {
                ...node.data,
                endpoint: values.endpoint,
                method: values.method,
                body: values.body,
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
          defaultEndpoint={nodeData.endpoint}
          defaultMethod={nodeData.method}
          defaultBody={nodeData.body}
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
