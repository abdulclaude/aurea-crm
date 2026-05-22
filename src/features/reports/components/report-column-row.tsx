"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckIcon, GripVerticalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortableColumnRowProps = {
  checked: boolean;
  id: string;
  label: string;
  onToggle: () => void;
};

export function SortableColumnRow({
  checked,
  id,
  label,
  onToggle,
}: SortableColumnRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center gap-2 px-2", isDragging && "opacity-70")}
    >
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-auto flex-1 justify-start gap-2 rounded-lg px-2 py-2 text-left text-xs font-normal",
          !checked && "text-primary/50 dark:text-white/30",
        )}
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        <CheckIcon
          className={cn(
            "size-3.5 shrink-0",
            checked ? "opacity-100" : "opacity-0",
          )}
        />
        <span className="flex-1 truncate">{label}</span>
      </Button>
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab rounded-lg p-2 text-primary/80 dark:text-white/40 transition hover:text-black dark:hover:text-white"
      >
        <GripVerticalIcon className="size-3.5" />
      </span>
    </div>
  );
}

export function FixedColumnRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs text-primary/80 dark:text-white/80">
      <CheckIcon className="size-3.5 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      <span className="rounded-lg bg-primary-foreground px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary/60">
        Locked
      </span>
    </div>
  );
}
