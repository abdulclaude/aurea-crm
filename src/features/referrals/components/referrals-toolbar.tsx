"use client";

import { IconSettingsSliderThree as FilterIcon } from "central-icons/IconSettingsSliderThree";
import { IconEyeSlash as EyeIcon } from "central-icons/IconEyeSlash";
import {
  CheckIcon,
  ChevronDown,
  GripVerticalIcon,
  SearchIcon,
} from "lucide-react";
import * as React from "react";
import { useDebouncedCallback } from "use-debounce";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "CONVERTED", label: "Converted" },
  { value: "EXPIRED", label: "Expired" },
];

const sortOptions = [
  { value: "expiresAt.desc", label: "Expires latest" },
  { value: "expiresAt.asc", label: "Expires soonest" },
  { value: "email.asc", label: "Email A → Z" },
  { value: "email.desc", label: "Email Z → A" },
];

const PRIMARY_COLUMN_ID = "refereeEmail";

export interface ReferralsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedStatuses: string[];
  sortValue: string;
  onSortChange: (value: string) => void;
  table: Table<any>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
  onApplyFilters: (filters: { statuses: string[] }) => void;
}

export function ReferralsToolbar({
  search,
  onSearchChange,
  selectedStatuses,
  sortValue,
  onSortChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
  onApplyFilters,
}: ReferralsToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const [stagedStatus, setStagedStatus] =
    React.useState<string[]>(selectedStatuses);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);
  React.useEffect(() => {
    setStagedStatus(selectedStatuses);
  }, [selectedStatuses]);

  const hasFilters = selectedStatuses.length > 0;

  return (
    <div className="flex justify-between w-full items-center py-4">
      <div className="flex items-center gap-2 w-full">
        <div className="flex w-80 items-center bg-background transition duration-250 relative hover:bg-primary-foreground/50 rounded-lg h-8.5">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />
          <Input
            placeholder="Search by email..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSearch(e.target.value);
            }}
            className="text-xs px-0 border-none bg-transparent! hover:bg-transparent w-full pl-8"
          />
          <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DropdownMenuTrigger asChild>
              <Button className="text-[11px] bg-transparent hover:bg-transparent border-none absolute right-0">
                <FilterIcon className="text-primary/80 dark:text-white/60 size-4" />
                {hasFilters && (
                  <span className="absolute -top-1 -right-1 size-3 rounded-full bg-blue-500 border-2 border-white" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-lg border border-black/10 dark:border-white/5 w-[260px] p-1 mt-2 -mr-[9px]"
            >
              <DropdownMenuSub>
                <h1 className="text-xs text-primary/80 dark:text-white/60 px-4 py-2.5">
                  Filters
                </h1>
              </DropdownMenuSub>
              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[200px] ml-2.5"
                  alignOffset={-5}
                >
                  <div className="space-y-1">
                    {statusOptions.map((opt) => (
                      <div
                        key={opt.value}
                        className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group px-2 hover:bg-primary-foreground/30"
                        onClick={() =>
                          setStagedStatus((prev) =>
                            prev.includes(opt.value)
                              ? prev.filter((v) => v !== opt.value)
                              : [...prev, opt.value],
                          )
                        }
                      >
                        <Checkbox
                          checked={stagedStatus.includes(opt.value)}
                          onCheckedChange={() =>
                            setStagedStatus((prev) =>
                              prev.includes(opt.value)
                                ? prev.filter((v) => v !== opt.value)
                                : [...prev, opt.value],
                            )
                          }
                          className="rounded-lg border-black/5 dark:border-white/5"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="select-none font-medium">
                          {opt.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2">
                    <Button
                      className="w-full border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStagedStatus([]);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <div className="pt-1">
                <Button
                  className="w-full border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyFilters({ statuses: stagedStatus });
                    setFiltersOpen(false);
                  }}
                >
                  Apply filters
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8.5!" variant="outline">
              Sort by{" "}
              <ChevronDown className="size-3 text-primary/80 dark:text-white/60" />
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

      <div className="flex gap-1">
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

function ColumnControls({
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
}: {
  table: Table<any>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
}) {
  const [open, setOpen] = React.useState(false);
  const columns = React.useMemo(
    () => table.getAllLeafColumns().filter((col) => col.getCanHide()),
    [table],
  );
  const orderedColumns = React.useMemo(() => {
    const map = new Map(columns.map((col) => [col.id as string, col]));
    const ordered = columnOrder
      .map((id) => map.get(id))
      .filter(Boolean) as typeof columns;
    if (ordered.length === columns.length) return ordered;
    return [
      ...ordered,
      ...columns.filter((col) => !columnOrder.includes(col.id as string)),
    ];
  }, [columns, columnOrder]);

  const fixedColumn = orderedColumns.find(
    (col) => col.id === PRIMARY_COLUMN_ID,
  );
  const draggableColumns = orderedColumns.filter(
    (col) => col.id !== PRIMARY_COLUMN_ID,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = draggableColumns.map((col) => col.id as string);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      onColumnOrderChange([
        PRIMARY_COLUMN_ID,
        ...arrayMove(ids, oldIndex, newIndex),
      ]);
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
            items={draggableColumns.map((col) => col.id as string)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1 pb-2 pt-2">
              {fixedColumn && (
                <FixedColumnRow
                  label={
                    (fixedColumn.columnDef.meta as any)?.label ?? fixedColumn.id
                  }
                />
              )}
              {draggableColumns.map((col) => {
                const id = col.id as string;
                const checked = columnVisibility[id] !== false;
                return (
                  <SortableColumnRow
                    key={id}
                    id={id}
                    label={(col.columnDef.meta as any)?.label ?? col.id}
                    checked={checked}
                    onToggle={() => col.toggleVisibility(!checked)}
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
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
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
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 px-2", isDragging && "opacity-70")}
    >
      <button
        type="button"
        className={cn(
          "flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition hover:bg-primary-foreground/50 hover:text-black dark:hover:text-white",
          !checked && "text-primary/80 dark:text-white/30",
        )}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
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
      </button>
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
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-white/80">
      <CheckIcon className="size-3.5 shrink-0 text-white" />
      <span className="flex-1 truncate">{label}</span>
      <span className="rounded-lg bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
        Locked
      </span>
    </div>
  );
}
