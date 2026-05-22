"use client";

import { useSortable } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstSortableChart({
  id,
  span,
  isEditing,
  maxCols,
  children,
  onRemove,
  onResize,
}: {
  id: string;
  span: number;
  isEditing: boolean;
  maxCols: number;
  children: React.ReactNode;
  onRemove: () => void;
  onResize: (delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id,
    disabled: !isEditing,
  });

  const colSpan = Math.min(span, maxCols);

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: `span ${colSpan} / span ${colSpan}`,
        opacity: isDragging ? 0 : 1,
      }}
      className="relative"
    >
      {children}

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute inset-0 z-10 rounded-xl"
          >
            <div className="pointer-events-auto absolute right-2.5 top-2.5 flex items-center gap-1">
              <div
                {...attributes}
                {...listeners}
                className="flex h-6 w-6 cursor-grab items-center justify-center rounded-md border border-border bg-background/90 text-muted-foreground shadow-xs hover:text-black active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical className="size-3" />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onRemove}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background/90 text-muted-foreground shadow-xs hover:text-black"
                title="Remove widget"
              >
                <X className="size-3" />
              </Button>
            </div>

            <div
              className="pointer-events-auto absolute bottom-2.5 right-2.5 flex items-center overflow-hidden rounded-full border border-border bg-background/90 shadow-xs"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={span <= 1}
                onClick={() => onResize(-1)}
                className="flex size-6 items-center justify-center rounded-none text-xs text-muted-foreground shadow-none ring-0 hover:text-black"
                title="Shrink"
              >
                –
              </Button>
              <span className="min-w-[2rem] select-none px-1.5 text-center text-[10px] font-medium text-muted-foreground">
                {span}×
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={span >= maxCols}
                onClick={() => onResize(1)}
                className="flex size-6 items-center justify-center rounded-none text-xs text-muted-foreground shadow-none ring-0 hover:text-black"
                title="Grow"
              >
                +
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
