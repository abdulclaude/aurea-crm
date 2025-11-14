"use client";

import Image from "next/image";
import React, { memo, type ReactNode } from "react";

import { type NodeProps, Position, useReactFlow } from "@xyflow/react";

import type { LucideIcon } from "lucide-react";

import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";

import { WorkflowNode } from "@/components/workflow-node";
import {
  NodeStatus,
  NodeStatusIndicator,
} from "@/components/react-flow/node-status-indicator";

interface BaseTriggerNodeProps extends NodeProps {
  icon: LucideIcon | string;
  name: string;
  description?: string;
  children?: ReactNode;
  status?: NodeStatus;
  onSettings?: () => void;
  onDoubleClick?: () => void;
}

export const BaseTriggerNode: React.FC<BaseTriggerNodeProps> = memo(
  ({
    id,
    icon: Icon,
    name,
    description,
    children,
    onSettings,
    onDoubleClick,
    status = "initial",
  }) => {
    const { setNodes, setEdges } = useReactFlow();

    const handleDelete = () => {
      setNodes((currentNodes) => {
        const updatedNodes = currentNodes.filter((node) => node.id !== id);
        return updatedNodes;
      });

      setEdges((currentEdges) => {
        const updatedEdges = currentEdges.filter(
          (edge) => edge.source !== id && edge.target !== id
        );

        return updatedEdges;
      });
    };

    return (
      <WorkflowNode
        name={name}
        description={description}
        onDelete={handleDelete}
        onSettings={onSettings}
      >
        <NodeStatusIndicator
          status={status}
          variant="border"
          className="rounded-l-2xl"
        >
          <BaseNode
            onDoubleClick={onDoubleClick}
            status={status}
            className="rounded-l-2xl relative group"
          >
            <BaseNodeContent>
              {typeof Icon === "string" ? (
                <Image src={Icon} alt={name} width={10} height={10} />
              ) : (
                <Icon className="size-3 text-gray-400" />
              )}

              {children}

              <BaseHandle
                id="source-1"
                type="source"
                position={Position.Right}
              />
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>
      </WorkflowNode>
    );
  }
);

BaseTriggerNode.displayName = "BaseTriggerNode";
