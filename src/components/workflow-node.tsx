"use client";

import { NodeToolbar, Position } from "@xyflow/react";
import { SettingsIcon } from "lucide-react";

import { IconRemoveKeyframe as TrashIcon } from "central-icons/IconRemoveKeyframe";

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
        <NodeToolbar className="bg-background text-primary border border-black/10 rounded-sm">
          <Button
            size="sm"
            variant="ghost"
            onClick={onSettings}
            className="hover:bg-primary-foreground/40 hover:text-primary transition duration-150 rounded-none rounded-l-sm  px-8"
          >
            <SettingsIcon className="size-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="hover:bg-primary-foreground/40 hover:text-primary transition duration-150 rounded-none rounded-r-sm  px-8"
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
          className="max-w-[150px] text-center space-y-1"
        >
          <p className=" text-xs font-medium text-primary">{name}</p>

          {description && (
            <p className="text-primary/60 truncate text-xs">{description}</p>
          )}
        </NodeToolbar>
      )}
    </>
  );
};
