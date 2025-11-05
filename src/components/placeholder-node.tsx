"use client";

import { forwardRef, type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { BaseNode } from "@/components/react-flow/base-node";

export type PlaceholderNodeProps = Partial<NodeProps> & {
  children?: ReactNode;
  onClick?: () => void;
};

export const PlaceholderNode = forwardRef<HTMLDivElement, PlaceholderNodeProps>(
  ({ children, onClick }, ref) => {
    return (
      <BaseNode
        ref={ref}
        className="w-auto h-auto border-dashed border-gray-300 bg-card p-4 text-center text-gray-300 shadow-none hover:border-gray-400 hover:text-gray-400 transition duration-250"
        onClick={onClick}
      >
        {children}
        <Handle
          type="target"
          style={{ visibility: "hidden" }}
          position={Position.Top}
          isConnectable={false}
        />
        <Handle
          type="source"
          style={{ visibility: "hidden" }}
          position={Position.Bottom}
          isConnectable={false}
        />
      </BaseNode>
    );
  }
);

PlaceholderNode.displayName = "PlaceholderNode";
