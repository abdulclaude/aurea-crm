"use client";

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

interface BaseExecutionNodeProps extends NodeProps {
  icon: LucideIcon | React.ComponentType<{ className?: string }> | string;
  name: string;
  description?: string;
  children?: ReactNode;
  status?: NodeStatus;
  onSettings?: () => void;
  onDoubleClick?: () => void;
  showTargetHandle?: boolean;
  showSourceHandle?: boolean;
}

export const BaseExecutionNode: React.FC<BaseExecutionNodeProps> = memo(
  ({
    id,
    icon: _Icon,
    name,
    description,
    children,
    onSettings,
    onDoubleClick,
    status = "initial",
    showTargetHandle = true,
    showSourceHandle = true,
  }) => {
    const { setNodes, setEdges } = useReactFlow();

    const handleDelete = () => {
      setNodes((currentNodes) => {
        const updatedNodes = currentNodes.filter((node) => node.id !== id);
        return updatedNodes;
      });

      setEdges((currentEdges) => {
        const updatedEdges = currentEdges.filter(
          (edge) => edge.source !== id && edge.target !== id,
        );

        return updatedEdges;
      });
    };

    return (
      <WorkflowNode onDelete={handleDelete} onSettings={onSettings}>
        <NodeStatusIndicator status={status}>
          <BaseNode
            onDoubleClick={onDoubleClick}
            status={status}
            className="w-[240px]"
          >
            <BaseNodeContent className="gap-0 p-0">
              <div className="flex items-center border-b border-black/5 px-3.5 py-3 dark:border-white/5">
                {/* Workflow node icons are hidden for now. Restore this block when the icon treatment returns.
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-primary-foreground/25 dark:border-white/10">
                  {typeof _Icon === "string" ? (
                    <Image
                      src={_Icon}
                      alt={name}
                      width={16}
                      height={16}
                      className="max-h-4 max-w-4 object-contain"
                    />
                  ) : (
                    <_Icon className="size-4 text-primary/60" />
                  )}
                </span>
                */}
                <span className="truncate text-xs font-medium text-primary">
                  {name}
                </span>
              </div>

              {description ? (
                <p className="line-clamp-3 px-3.5 py-3 text-[10px] leading-4 text-primary/55">
                  {description}
                </p>
              ) : null}

              {children}

              {showTargetHandle ? (
                <BaseHandle
                  id="target-1"
                  type="target"
                  position={Position.Left}
                />
              ) : null}
              {showSourceHandle ? (
                <BaseHandle
                  id="source-1"
                  type="source"
                  position={Position.Right}
                />
              ) : null}
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>
      </WorkflowNode>
    );
  },
);

BaseExecutionNode.displayName = "BaseExecutionNode";
