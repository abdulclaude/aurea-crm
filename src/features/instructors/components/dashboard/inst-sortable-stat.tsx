"use client";

import { useSortable } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstSortableStat({
  id,
  isEditing,
  children,
  onRemove,
}: {
  id: string;
  isEditing: boolean;
  children: React.ReactNode;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id,
    disabled: !isEditing,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0 : 1 }}
      className="relative h-full"
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
            <div className="pointer-events-auto absolute right-2 top-2 flex items-center gap-1">
              <div
                {...attributes}
                {...listeners}
                className="flex h-5 w-5 cursor-grab items-center justify-center rounded-md border border-border bg-background/90 text-muted-foreground shadow-xs hover:text-black active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical className="size-2.5" />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onRemove}
                className="flex h-5 w-5 items-center justify-center rounded-md border border-border bg-background/90 text-muted-foreground shadow-xs hover:text-black"
                title="Remove"
              >
                <X className="size-2.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
