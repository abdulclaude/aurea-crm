"use client";

import type { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import React, { memo, useState } from "react";

import { BaseExecutionNode } from "@/features/executions/base-execution-node";

type HttpRequestNodeData = {
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
  [key: string]: unknown;
};

type HttpRequestNodeType = Node<HttpRequestNodeData>;

export const HttpRequestNode: React.FC<NodeProps<HttpRequestNodeType>> = memo(
  (props) => {
    const nodeData = props.data as HttpRequestNodeData;
    const description = nodeData?.endpoint
      ? `${nodeData.method || "GET"}: ${nodeData.endpoint}`
      : "Not configured";

    return (
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={GlobeIcon}
        name="HTTP Request"
        description={description}
        onSettings={() => {}}
        onDoubleClick={() => {}}
      />
    );
  }
);

HttpRequestNode.displayName = "HttpRequestNode";
