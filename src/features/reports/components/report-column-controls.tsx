"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type {
  ColumnOrderState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";
import { IconEyeSlash as EyeIcon } from "central-icons/IconEyeSlash";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import {
  FixedColumnRow,
  SortableColumnRow,
} from "@/features/reports/components/report-column-row";

type ReportColumnControlsProps<TData> = {
  columnLabels: Readonly<Record<string, string>>;
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
  initialColumnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  primaryColumnId: string;
  table: Table<TData>;
};

export function ReportColumnControls<TData>({
  columnLabels,
  columnOrder,
  columnVisibility,
  initialColumnOrder,
  onColumnOrderChange,
  primaryColumnId,
  table,
}: ReportColumnControlsProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const columns = React.useMemo(
    () => table.getAllLeafColumns().filter((column) => column.getCanHide()),
    [table],
  );
  const orderedColumns = React.useMemo(() => {
    const map = new Map(columns.map((column) => [column.id, column]));
    const ordered = columnOrder
      .map((id) => map.get(id))
      .filter((column): column is (typeof columns)[number] => Boolean(column));
    const missing = columns.filter((column) => !columnOrder.includes(column.id));
    return [...ordered, ...missing];
  }, [columns, columnOrder]);
  const fixedColumn = orderedColumns.find(
    (column) => column.id === primaryColumnId,
  );
  const draggableColumns = orderedColumns.filter(
    (column) => column.id !== primaryColumnId,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const reorderableIds = draggableColumns.map((column) => column.id);
      const oldIndex = reorderableIds.indexOf(String(active.id));
      const newIndex = reorderableIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      onColumnOrderChange([
        primaryColumnId,
        ...arrayMove(reorderableIds, oldIndex, newIndex),
      ]);
    },
    [draggableColumns, onColumnOrderChange, primaryColumnId],
  );

  return (
    <Select open={open} onOpenChange={setOpen} value="columns">
      <SelectTrigger
        className="gap-2 rounded-lg bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-primary/80 font-normal h-8.5!"
        chevron={false}
      >
        <EyeIcon className="size-3 dark:text-white/60" />
        <span>Columns</span>
      </SelectTrigger>

      <SelectContent className="w-64 border-black/10 dark:border-white/5 bg-background p-0 shadow-2xl backdrop-blur rounded-lg text-primary/80">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={draggableColumns.map((column) => column.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1 pb-2 pt-2">
              {fixedColumn ? (
                <FixedColumnRow
                  label={columnLabels[fixedColumn.id] ?? fixedColumn.id}
                />
              ) : null}
              {draggableColumns.map((column) => {
                const checked = columnVisibility[column.id] !== false;
                return (
                  <SortableColumnRow
                    key={column.id}
                    id={column.id}
                    label={columnLabels[column.id] ?? column.id}
                    checked={checked}
                    onToggle={() => column.toggleVisibility(!checked)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        <div className="px-2 pb-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center px-4! py-2 text-left text-xs text-primary/80 font-normal dark:text-white transition bg-background hover:text-black dark:hover:text-white"
            onClick={(event) => {
              event.preventDefault();
              table.resetColumnVisibility();
              onColumnOrderChange(initialColumnOrder);
              setOpen(false);
            }}
          >
            Reset columns
          </Button>
        </div>
      </SelectContent>
    </Select>
  );
}
