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
import { IconSettingsSliderThree as FilterIcon } from "central-icons/IconSettingsSliderThree";
import { IconCalendarClock4 as CalendarIcon } from "central-icons/IconCalendarClock4";
import { IconDumbell as InstructorIcon } from "central-icons/IconDumbell";
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
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DateRangeFilter from "@/components/ui/date-range-filter";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface ClassesToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  table: Table<any>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
  startDate?: Date;
  endDate?: Date;
  onDateRangeChange?: (start?: Date, end?: Date) => void;
  instructor?: string;
  onInstructorChange?: (value: string) => void;
  onClearFilters: () => void;
  stats?: {
    totalClasses: number;
    upcomingClasses: number;
    totalBookings: number;
    activeMembers: number;
  };
}

const sortOptions = [
  { value: "name.asc", label: "Name A → Z" },
  { value: "name.desc", label: "Name Z → A" },
  { value: "startTime.asc", label: "Earliest first" },
  { value: "startTime.desc", label: "Latest first" },
  { value: "instructorName.asc", label: "Instructor A → Z" },
  { value: "instructorName.desc", label: "Instructor Z → A" },
];

const PRIMARY_COLUMN_ID = "select";

export function ClassesToolbar({
  search,
  onSearchChange,
  sortValue,
  onSortChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
  startDate,
  endDate,
  onDateRangeChange,
  instructor,
  onInstructorChange,
  onClearFilters,
  stats,
}: ClassesToolbarProps) {
  const [localSearch, setLocalSearch] = React.useState(search);
  const [localInstructor, setLocalInstructor] = React.useState(
    instructor || ""
  );
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const debouncedSearchChange = useDebouncedCallback(onSearchChange, 300);
  const debouncedInstructorChange = useDebouncedCallback(
    onInstructorChange || (() => {}),
    300
  );

  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  React.useEffect(() => {
    setLocalInstructor(instructor || "");
  }, [instructor]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    debouncedSearchChange(value);
  };

  const handleInstructorChange = (value: string) => {
    setLocalInstructor(value);
    debouncedInstructorChange(value);
  };

  const handleClearAllFilters = () => {
    setLocalSearch("");
    setLocalInstructor("");
    onClearFilters();
  };

  const hasActiveFilters = search || instructor || startDate || endDate;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columnOrder.indexOf(active.id as string);
    const newIndex = columnOrder.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
    onColumnOrderChange(newOrder);
  };

  const visibleColumns = React.useMemo(() => {
    return table
      .getAllColumns()
      .filter(
        (col) =>
          col.id !== PRIMARY_COLUMN_ID &&
          col.getCanHide() &&
          typeof col.columnDef.header === "string"
      );
  }, [table]);

  const orderedColumns = React.useMemo(() => {
    const orderMap = new Map(columnOrder.map((id, idx) => [id, idx]));
    return [...visibleColumns].sort((a, b) => {
      const aIdx = orderMap.get(a.id) ?? Number.POSITIVE_INFINITY;
      const bIdx = orderMap.get(b.id) ?? Number.POSITIVE_INFINITY;
      return aIdx - bIdx;
    });
  }, [visibleColumns, columnOrder]);

  return (
    <div className="flex flex-col gap-3">
      {/* Top row: Search, Sort, Filters, View */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-primary/50" />
          <Input
            placeholder="Search classes..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-9 text-xs bg-background border-black/5 dark:border-white/5"
          />
        </div>

        {/* Sort */}
        <Select value={sortValue} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px] h-9 text-xs bg-background border-black/5 dark:border-white/5">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent className="bg-background border-black/5 dark:border-white/5">
            {sortOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-xs"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced Filters Dropdown */}
        <div className="flex items-center gap-2">
          <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs border-black/5 dark:border-white/5"
              >
                <FilterIcon className="size-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 size-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    !
                  </span>
                )}
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 bg-background border-black/5 dark:border-white/5"
            >
              <DropdownMenuLabel className="text-xs text-primary/80 dark:text-white/50">
                Filter classes
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />

              {/* Date Range Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CalendarIcon className="size-4" />
                  Date Range
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  <DateRangeFilter
                    minDate={new Date(2020, 0, 1)}
                    maxDate={
                      new Date(
                        new Date().setFullYear(new Date().getFullYear() + 1)
                      )
                    }
                    valueStart={startDate}
                    valueEnd={endDate}
                    onChange={(start, end) => onDateRangeChange?.(start, end)}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Instructor Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <InstructorIcon className="size-4" />
                  Instructor
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 w-[280px] ml-2.5"
                  alignOffset={-5}
                >
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-primary/80">
                        Instructor name
                      </Label>
                      <Input
                        placeholder="Filter by instructor"
                        value={localInstructor}
                        onChange={(e) => handleInstructorChange(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      className="w-full border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocalInstructor("");
                        onInstructorChange?.("");
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />

              <div className="p-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllFilters}
                  className="w-full h-8 text-xs"
                >
                  Clear all filters
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Column Visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs border-black/5 dark:border-white/5"
            >
              <EyeIcon className="size-4" />
              View
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-background border-black/5 dark:border-white/5"
          >
            <DropdownMenuLabel className="text-xs text-primary/80">
              Toggle columns
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
            <div className="p-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedColumns.map((col) => col.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {orderedColumns.map((column) => (
                      <SortableColumnItem
                        key={column.id}
                        column={column}
                        isVisible={columnVisibility[column.id] !== false}
                        onToggle={(visible) => {
                          table.getColumn(column.id)?.toggleVisibility(visible);
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="flex items-center gap-4 text-xs text-primary/75">
          <span>
            <strong className="text-primary font-medium">
              {stats.totalClasses}
            </strong>{" "}
            total classes
          </span>
          <span>•</span>
          <span>
            <strong className="text-primary font-medium">
              {stats.upcomingClasses}
            </strong>{" "}
            upcoming
          </span>
          <span>•</span>
          <span>
            <strong className="text-primary font-medium">
              {stats.totalBookings}
            </strong>{" "}
            bookings
          </span>
        </div>
      )}
    </div>
  );
}

interface SortableColumnItemProps {
  column: any;
  isVisible: boolean;
  onToggle: (visible: boolean) => void;
}

function SortableColumnItem({
  column,
  isVisible,
  onToggle,
}: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label =
    (column.columnDef.meta as any)?.label ||
    (typeof column.columnDef.header === "string"
      ? column.columnDef.header
      : column.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-primary/5",
        isDragging && "opacity-50 bg-primary/10"
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-3.5 text-primary/50" />
      </button>
      <button
        type="button"
        onClick={() => onToggle(!isVisible)}
        className="flex flex-1 items-center gap-2 text-left"
      >
        <div
          className={cn(
            "size-4 rounded border flex items-center justify-center",
            isVisible
              ? "bg-primary border-primary"
              : "border-black/10 dark:border-white/10"
          )}
        >
          {isVisible && (
            <CheckIcon className="size-3 text-primary-foreground" />
          )}
        </div>
        <span className="text-primary">{label}</span>
      </button>
    </div>
  );
}
