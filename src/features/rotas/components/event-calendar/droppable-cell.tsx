"use client";

import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { useCalendarDnd } from "@/features/rotas/components/event-calendar";

interface DroppableCellProps {
  id: string;
  date: Date;
  time?: number; // For week/day views, represents hours (e.g., 9.25 for 9:15)
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onMouseDown?: () => void;
  onMouseEnter?: () => void;
  isSelected?: boolean;
}

export function DroppableCell({
  id,
  date,
  time,
  children,
  className,
  style,
  onClick,
  onMouseDown,
  onMouseEnter,
  isSelected,
}: DroppableCellProps) {
  const { activeEvent } = useCalendarDnd();

  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      date,
      time,
    },
  });

  // Format time for display in tooltip (only for debugging)
  const formattedTime =
    time !== undefined
      ? `${Math.floor(time)}:${Math.round((time - Math.floor(time)) * 60)
          .toString()
          .padStart(2, "0")}`
      : null;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      className={cn(
        "data-dragging:bg-accent flex h-full flex-col px-0.5 py-1 sm:px-1",
        isSelected && "bg-primary/10",
        className,
      )}
      style={style}
      title={formattedTime ? `${formattedTime}` : undefined}
      data-dragging={isOver && activeEvent ? true : undefined}
    >
      {children}
    </div>
  );
}
