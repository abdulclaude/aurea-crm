"use client";

import { FolderIcon, FolderOpenIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WorkflowFolderCard({
  active,
  label,
  count,
  color,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  color?: string | null;
  description: string;
  onClick: () => void;
}) {
  const Icon = active ? FolderOpenIcon : FolderIcon;
  const accent = color ?? "#2563eb";

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-auto min-w-[210px] items-start justify-start gap-3 rounded-lg border bg-background px-4 py-3 text-left hover:bg-background",
        active
          ? "border-primary/50 shadow-xs"
          : "border-black/10 hover:border-black/20 hover:shadow-xs dark:border-white/10",
      )}
      onClick={onClick}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-black/5 dark:border-white/5"
        style={{ backgroundColor: `${accent}14`, color: accent }}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-primary">
          {label}
        </span>
        <span className="mt-1 block truncate text-xs font-normal text-primary/45">
          {description}
        </span>
      </span>
      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-primary/70 dark:bg-white/5">
        {count}
      </span>
    </Button>
  );
}
