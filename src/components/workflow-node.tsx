"use client";

import { NodeToolbar, Position } from "@xyflow/react";
import { SettingsIcon, TrashIcon } from "lucide-react";

import type { ReactNode } from "react";
import { Button } from "./ui/button";

interface WorkflowNodeProps {
  children: ReactNode;
  showToolbar?: boolean;
  onDelete?: () => void;
  onSettings?: () => void;
  name?: string;
  description?: string;
}

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  children,
  showToolbar = true,
  onDelete,
  onSettings,
  name,
  description,
}) => {
  return (
    <>
      {showToolbar && (
        <NodeToolbar className="bg-primary text-white border rounded-xl">
          <Button
            size="sm"
            variant="ghost"
            onClick={onSettings}
            className="hover:bg-primary hover:brightness-120 transition duration-150 hover:text-white rounded-none rounded-l-xl px-8"
          >
            <SettingsIcon className="size-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="hover:bg-primary hover:brightness-120 transition duration-150 hover:text-white rounded-none rounded-r-xl px-8"
          >
            <TrashIcon className="size-4" />
          </Button>
        </NodeToolbar>
      )}
      {children}

      {name && (
        <NodeToolbar
          position={Position.Bottom}
          isVisible
          className="max-w-[200px] text-center space-y-1"
        >
          <p className="font-semibold text-sm">{name}</p>

          {description && (
            <p className="text-muted-foreground truncate text-xs">
              {description}
            </p>
          )}
        </NodeToolbar>
      )}
    </>
  );
};
