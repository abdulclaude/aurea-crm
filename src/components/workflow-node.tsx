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
        <NodeToolbar className="overflow-hidden rounded-lg border border-black/10 bg-background text-primary shadow-sm dark:border-white/10">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onSettings}
            className="rounded-none border-r border-black/5 transition duration-150 hover:bg-primary-foreground/40 hover:text-primary dark:border-white/5"
            aria-label="Configure node"
          >
            <SettingsIcon className="size-3.5" />
          </Button>

          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onDelete}
            className="rounded-none transition duration-150 hover:bg-rose-500/10 hover:text-rose-600"
            aria-label="Delete node"
          >
            <TrashIcon className="size-3.5" />
          </Button>
        </NodeToolbar>
      )}
      {children}

      {name ? (
        <NodeToolbar
          position={Position.Bottom}
          isVisible
          className="max-w-[180px] space-y-1 text-center"
        >
          <p className="text-xs font-medium text-primary">{name}</p>
          {description ? (
            <p className="truncate text-xs text-primary/60">{description}</p>
          ) : null}
        </NodeToolbar>
      ) : null}
    </>
  );
};
