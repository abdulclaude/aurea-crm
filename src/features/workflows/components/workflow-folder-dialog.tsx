"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WorkflowFolder } from "./workflow-folders";

export const WORKFLOW_FOLDER_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#0f766e",
];

export function WorkflowFolderDialog({
  folder,
  initialColor,
  open,
  pending,
  onOpenChange,
  onSubmit,
}: {
  folder: WorkflowFolder | null;
  initialColor: string;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { name: string; color: string }) => void;
}) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(initialColor);

  React.useEffect(() => {
    if (!open) return;
    setName(folder?.name ?? "");
    setColor(folder?.color ?? initialColor);
  }, [folder, initialColor, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{folder ? "Rename folder" : "New workflow folder"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workflow-folder-name">Folder name</Label>
            <Input
              id="workflow-folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sales / Consultation"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label>Folder color</Label>
            <div className="flex flex-wrap gap-2">
              {WORKFLOW_FOLDER_COLORS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "size-7 rounded-full border border-black/10 p-0 shadow-sm ring-offset-2 hover:scale-105",
                    color === option && "ring-2 ring-primary",
                  )}
                  style={{ backgroundColor: option }}
                  aria-label={`Use ${option}`}
                  onClick={() => setColor(option)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !name.trim()}
            onClick={() => onSubmit({ name: name.trim(), color })}
          >
            {folder ? "Save folder" : "Create folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
