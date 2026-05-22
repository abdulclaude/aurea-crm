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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  ColumnOrderState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";
import { IconEyeSlash as EyeIcon } from "central-icons/IconEyeSlash";
import {
  CheckIcon,
  ChevronDown,
  GripVerticalIcon,
  SearchIcon,
} from "lucide-react";
import * as React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface HouseholdsToolbarProps<TData> {
  search: string;
  onSearchChange: (search: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  table: Table<TData>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
}

const sortOptions = [
  { value: "updatedAt.desc", label: "Recently updated" },
  { value: "updatedAt.asc", label: "Oldest updates" },
  { value: "name.asc", label: "Name A → Z" },
  { value: "name.desc", label: "Name Z → A" },
  { value: "members.desc", label: "Most members" },
  { value: "members.asc", label: "Fewest members" },
];

const PRIMARY_COLUMN_ID = "name";

export function HouseholdsToolbar<TData>({
  search,
  onSearchChange,
  sortValue,
  onSortChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
}: HouseholdsToolbarProps<TData>) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  return (
    <div className="flex justify-between w-full items-center py-4">
      <div className="flex items-center gap-2 w-full">
        <div className="flex w-128 items-center bg-background transition duration-250 relative hover:bg-primary-foreground/50 hover:text-black rounded-lg h-8.5">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />
          <Input
            placeholder="Search households by name, client..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="text-xs px-0 border-none bg-transparent! hover:bg-transparent w-128 pl-8"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-8.5!">
              Sort by
              <ChevronDown className="size-3.5 text-primary/80 dark:text-white/60 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="rounded-lg bg-background border border-black/10 dark:border-white/5 w-[220px] p-1"
          >
            {sortOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={sortValue === option.value}
                onSelect={() => onSortChange(option.value)}
                className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black rounded-lg cursor-pointer"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex gap-2">
        <ColumnControls
          table={table}
          columnVisibility={columnVisibility}
          columnOrder={columnOrder}
          onColumnOrderChange={onColumnOrderChange}
          initialColumnOrder={initialColumnOrder}
        />
      </div>
    </div>
  );
}

interface ColumnControlsProps<TData> {
  table: Table<TData>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
}

function ColumnControls<TData>({
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
}: ColumnControlsProps<TData>) {
  const [open, setOpen] = React.useState(false);

  const columns = React.useMemo(
    () => table.getAllLeafColumns().filter((column) => column.getCanHide()),
    [table],
  );

  const orderedColumns = React.useMemo(() => {
    const map = new Map(columns.map((column) => [column.id as string, column]));
    const ordered = columnOrder
      .map((id) => map.get(id))
      .filter((column): column is (typeof columns)[number] => Boolean(column));
    if (ordered.length === columns.length) return ordered;
    const missing = columns.filter(
      (column) => !columnOrder.includes(column.id as string),
    );
    return [...ordered, ...missing];
  }, [columns, columnOrder]);

  const fixedColumn = orderedColumns.find(
    (column) => column.id === PRIMARY_COLUMN_ID,
  );
  const draggableColumns = orderedColumns.filter(
    (column) => column.id !== PRIMARY_COLUMN_ID,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const reorderableIds = draggableColumns.map(
        (column) => column.id as string,
      );
      const oldIndex = reorderableIds.indexOf(active.id as string);
      const newIndex = reorderableIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const nextOrder = [
        PRIMARY_COLUMN_ID,
        ...arrayMove(reorderableIds, oldIndex, newIndex),
      ];
      onColumnOrderChange(nextOrder);
    },
    [draggableColumns, onColumnOrderChange],
  );

  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value="columns"
      onValueChange={() => {}}
    >
      <SelectTrigger
        className="gap-2 rounded-lg bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-primary/80 dark:text-white font-normal h-8.5!"
        chevron={false}
      >
        <EyeIcon className="size-3.5 dark:text-white/60" />
        <span className="flex items-center gap-2">Columns</span>
      </SelectTrigger>

      <SelectContent
        className="w-64 border-black/10 dark:border-white/5 bg-background p-0 shadow-2xl backdrop-blur rounded-lg text-primary/80"
        align="end"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={draggableColumns.map((column) => column.id as string)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1 pb-2 pt-2">
              {fixedColumn ? (
                <FixedColumnRow
                  label={
                    (fixedColumn.columnDef.meta as Record<string, string>)
                      ?.label ?? fixedColumn.id
                  }
                />
              ) : null}
              {draggableColumns.map((column) => {
                const id = column.id as string;
                const checked = columnVisibility[id] !== false;
                return (
                  <SortableColumnRow
                    key={id}
                    id={id}
                    label={
                      (column.columnDef.meta as Record<string, string>)
                        ?.label ?? column.id
                    }
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
            variant="ghost"
            className="w-full justify-center px-4! py-2 text-left text-xs text-primary/80 font-normal dark:text-white transition bg-background hover:bg-primary/15 hover:text-black dark:hover:text-white rounded-lg border-black/15 dark:border-white/5"
            onMouseDown={(event) => event.preventDefault()}
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

function SortableColumnRow({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
          "flex h-auto flex-1 items-center justify-start gap-2 rounded-lg px-2 py-2 text-left text-xs font-normal transition hover:bg-primary-foreground/50 hover:text-black dark:hover:text-white",
          !checked && "text-primary/80 dark:text-white/30",
        )}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        <CheckIcon
          className={cn(
            "size-3.5 shrink-0 text-primary/80 dark:text-white transition",
            checked ? "opacity-100" : "opacity-0",
          )}
        />
        <span className="flex-1 truncate text-primary/80 hover:text-black dark:text-white">
          {label}
        </span>
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

function FixedColumnRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-primary/80 dark:text-white/80">
      <CheckIcon className="size-3.5 shrink-0 text-primary/80 dark:text-white" />
      <span className="flex-1 truncate text-primary/80 dark:text-white/80">
        {label}
      </span>
      <span className="rounded-lg bg-primary/80 dark:bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white dark:text-primary/80">
        Locked
      </span>
    </div>
  );
}
