"use client";

import Image from "next/image";
import React, { memo, type ReactNode } from "react";

import { type NodeProps, Position } from "@xyflow/react";

import type { LucideIcon } from "lucide-react";

import {
  BaseNode,
  BaseNodeContent,
} from "../../components/react-flow/base-node";
import { BaseHandle } from "../../components/react-flow/base-handle";

import { WorkflowNode } from "../../components/workflow-node";

interface BaseTriggerNodeProps extends NodeProps {
  icon: LucideIcon | string;
  name: string;
  description?: string;
  children?: ReactNode;
  // status?: NodeStatus;
  onSettings?: () => void;
  onDoubleClick?: () => void;
}

export const BaseTriggerNode: React.FC<BaseTriggerNodeProps> = memo(
  ({ icon: Icon, name, description, children, onSettings, onDoubleClick }) => {
    const handleDelete = () => {};

    return (
      <WorkflowNode
        name={name}
        description={description}
        onDelete={handleDelete}
        onSettings={onSettings}
      >
        <BaseNode
          onDoubleClick={onDoubleClick}
          className="rounded-l-2xl relative group"
        >
          <BaseNodeContent>
            {typeof Icon === "string" ? (
              <Image src={Icon} alt={name} width={12} height={12} />
            ) : (
              <Icon className="size-3 text-gray-400" />
            )}

            {children}

            <BaseHandle id="source-1" type="source" position={Position.Right} />
          </BaseNodeContent>
        </BaseNode>
      </WorkflowNode>
    );
  }
);

BaseTriggerNode.displayName = "BaseTriggerNode";
