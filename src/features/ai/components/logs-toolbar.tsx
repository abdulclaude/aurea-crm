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
import { useSuspenseQuery } from "@tanstack/react-query";
import { IconEyeSlash as EyeIcon } from "central-icons/IconEyeSlash";
import { IconSettingsSliderThree as FilterIcon } from "central-icons/IconSettingsSliderThree";
import {
  CheckIcon,
  ChevronDown,
  GripVerticalIcon,
  SearchIcon,
} from "lucide-react";
import * as React from "react";
import { useDebouncedCallback } from "use-debounce";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DateRangeFilter from "@/components/ui/date-range-filter";
import { cn } from "@/lib/utils";
import { AILogStatus } from "@prisma/client";

export interface LogsToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  selectedStatuses: string[];
  selectedIntents: string[];
  selectedUserIds: string[];
  onApplyAllFilters: (filters: {
    statuses: string[];
    intents: string[];
    userIds: string[];
  }) => void;
  onClearFilters: () => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  table: Table<any>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
  createdAtStart?: Date;
  createdAtEnd?: Date;
  onCreatedAtChange?: (start?: Date, end?: Date) => void;
  completedAtStart?: Date;
  completedAtEnd?: Date;
  onCompletedAtChange?: (start?: Date, end?: Date) => void;
  stats?: {
    total: number;
    statusCounts: Record<AILogStatus, number>;
  };
}

const sortOptions = [
  { value: "title.asc", label: "Title A → Z" },
  { value: "title.desc", label: "Title Z → A" },
  { value: "createdAt.desc", label: "Recently created" },
  { value: "createdAt.asc", label: "Oldest created" },
  { value: "completedAt.desc", label: "Recently completed" },
  { value: "completedAt.asc", label: "Oldest completed" },
];

const PRIMARY_COLUMN_ID = "title";

const statusOptions = [
  { value: AILogStatus.PENDING, label: "Pending" },
  { value: AILogStatus.RUNNING, label: "Running" },
  { value: AILogStatus.COMPLETED, label: "Completed" },
  { value: AILogStatus.FAILED, label: "Failed" },
];

export function LogsToolbar({
  search,
  onSearchChange,
  selectedStatuses,
  selectedIntents,
  selectedUserIds,
  onApplyAllFilters,
  onClearFilters,
  sortValue,
  onSortChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
  createdAtStart,
  createdAtEnd,
  onCreatedAtChange,
  completedAtStart,
  completedAtEnd,
  onCompletedAtChange,
  stats,
}: LogsToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [stagedStatuses, setStagedStatuses] =
    React.useState<string[]>(selectedStatuses);
  const [stagedIntents, setStagedIntents] =
    React.useState<string[]>(selectedIntents);
  const [stagedUserIds, setStagedUserIds] =
    React.useState<string[]>(selectedUserIds);

  const trpc = useTRPC();

  // Fetch ALL logs (unfiltered) for preview calculation
  const { data: allLogsData } = useSuspenseQuery(
    trpc.logs.list.queryOptions({})
  );

  const allLogsUnfiltered = React.useMemo(
    () => allLogsData?.items || [],
    [allLogsData]
  );

  // Fetch date range for filters
  const { data: dateRange } = useSuspenseQuery(
    trpc.logs.dateRange.queryOptions()
  );

  // Fetch filter options (unique intents and users)
  const { data: filterOptions } = useSuspenseQuery(
    trpc.logs.filterOptions.queryOptions()
  );

  const availableIntents = filterOptions?.intents || [];
  const availableUsers = filterOptions?.users || [];

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    setStagedStatuses(selectedStatuses);
  }, [selectedStatuses]);

  React.useEffect(() => {
    setStagedIntents(selectedIntents);
  }, [selectedIntents]);

  React.useEffect(() => {
    setStagedUserIds(selectedUserIds);
  }, [selectedUserIds]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleToggleStatus = (value: string) => {
    setStagedStatuses((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleToggleIntent = (value: string) => {
    setStagedIntents((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleToggleUser = (value: string) => {
    setStagedUserIds((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  // Calculate preview count considering ALL staged filters combined
  const previewCount = React.useMemo(() => {
    const filtered = allLogsUnfiltered.filter((log) => {
      // Check statuses filter (if any selected)
      if (stagedStatuses.length > 0) {
        if (!stagedStatuses.includes(log.status)) {
          return false;
        }
      }

      // Check intents filter (if any selected)
      if (stagedIntents.length > 0) {
        if (!log.intent || !stagedIntents.includes(log.intent)) {
          return false;
        }
      }

      // Check users filter (if any selected)
      if (stagedUserIds.length > 0) {
        if (!stagedUserIds.includes(log.userId)) {
          return false;
        }
      }

      return true;
    });
    return filtered.length;
  }, [allLogsUnfiltered, stagedStatuses, stagedIntents, stagedUserIds]);

  const hasFiltersApplied =
    selectedStatuses.length > 0 ||
    selectedIntents.length > 0 ||
    selectedUserIds.length > 0 ||
    createdAtStart ||
    createdAtEnd ||
    completedAtStart ||
    completedAtEnd;

  const handleApplyFilters = () => {
    onApplyAllFilters({
      statuses: stagedStatuses,
      intents: stagedIntents,
      userIds: stagedUserIds,
    });
    setFiltersOpen(false);
  };

  const handleClearAllFilters = () => {
    setStagedStatuses([]);
    setStagedIntents([]);
    setStagedUserIds([]);
    onApplyAllFilters({
      statuses: [],
      intents: [],
      userIds: [],
    });
  };

  return (
    <div className="flex justify-between w-full items-center">
      <div className="flex items-center gap-2 w-full">
        {/* Search with filters inside */}
        <div className="flex w-128 items-center bg-backgroundtransition duration-250 relative hover:bg-primary-foreground/50 hover:text-black rounded-lg h-8.5">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />

          <Input
            placeholder="Search contacts by name, email, company..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-128 pl-8"
          />

          <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DropdownMenuTrigger asChild>
              <Button className="text-[11px] bg-transparent hover:bg-transparent border-none absolute right-0">
                <FilterIcon className="text-primary/80 dark:text-white/60 size-4 hover:text-black" />
                {hasFiltersApplied && (
                  <span className="absolute -top-1.5 -right-1.5 size-3 rounded-full bg-blue-500 border-2 border-white" />
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="rounded-lg border border-black/10 dark:border-white/5 w-[300px] p-1 mt-2 -mr-[9px]"
            >
              <DropdownMenuSub>
                <h1 className="text-xs text-primary/80 dark:text-white/60 px-4 py-2.5">
                  Filters
                </h1>
              </DropdownMenuSub>

              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />

              {/* Status Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                  alignOffset={-5}
                >
                  <div className="max-h-64 overflow-auto pr-1">
                    {statusOptions.map((status) => (
                      <div
                        key={status.value}
                        className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                      >
                        <Checkbox
                          checked={stagedStatuses.includes(status.value)}
                          onCheckedChange={() =>
                            handleToggleStatus(status.value)
                          }
                          className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground  data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                        />
                        <span className="select-none">
                          {status.label}
                          {stats && (
                            <span className="text-primary/60 ml-2">
                              (
                              {stats.statusCounts[
                                status.value as AILogStatus
                              ] || 0}
                              )
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button
                      className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStagedStatuses([]);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Intent Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Intent</DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                  alignOffset={-5}
                >
                  <div className="max-h-64 overflow-auto pr-1">
                    {availableIntents.length === 0 ? (
                      <div className="px-4 py-2.5 text-xs text-primary/75">
                        No intents available
                      </div>
                    ) : (
                      availableIntents.map((intent) => (
                        <div
                          key={intent}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedIntents.includes(intent)}
                            onCheckedChange={() => handleToggleIntent(intent)}
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground  data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">{intent}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button
                      className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStagedIntents([]);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* User Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>User</DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                  alignOffset={-5}
                >
                  <div className="max-h-64 overflow-auto pr-1">
                    {availableUsers.length === 0 ? (
                      <div className="px-4 py-2.5 text-xs text-primary/75">
                        No users available
                      </div>
                    ) : (
                      availableUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedUserIds.includes(user.id)}
                            onCheckedChange={() => handleToggleUser(user.id)}
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground  data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <Avatar className="size-5">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback className="text-[8px] text-white bg-[#202e32] brightness-120">
                              {user.name?.substring(0, 2).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="select-none truncate">
                            {user.name || user.email || "Unknown"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button
                      className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStagedUserIds([]);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Created Date Filter */}
              {onCreatedAtChange && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Created Date</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent alignOffset={-5}>
                    <DateRangeFilter
                      minDate={dateRange?.createdAtMin || new Date(2020, 0, 1)}
                      maxDate={dateRange?.createdAtMax || new Date()}
                      valueStart={createdAtStart}
                      valueEnd={createdAtEnd}
                      onChange={(start, end) => onCreatedAtChange?.(start, end)}
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Completed Date Filter */}
              {onCompletedAtChange && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Completed Date
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent alignOffset={-5}>
                    <DateRangeFilter
                      minDate={
                        dateRange?.completedAtMin || new Date(2020, 0, 1)
                      }
                      maxDate={dateRange?.completedAtMax || new Date()}
                      valueStart={completedAtStart}
                      valueEnd={completedAtEnd}
                      onChange={(start, end) =>
                        onCompletedAtChange?.(start, end)
                      }
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              <div className="p-1 space-y-2">
                <Button onClick={handleApplyFilters} variant="filter">
                  Show {previewCount} log{previewCount !== 1 ? "s" : ""}
                </Button>
                {hasFiltersApplied && (
                  <Button
                    variant="ghost"
                    onClick={handleClearAllFilters}
                    className="w-full justify-center text-xs h-7 text-primary/80 dark:text-white/60 hover:text-primary dark:hover:text-white hover:bg-primary-foreground/50"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Sort by
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
                onSelect={() => {
                  onSortChange(option.value);
                }}
                className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black rounded-lg cursor-pointer"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Column visibility and ordering on the right */}
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

interface ColumnControlsProps {
  table: Table<any>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
}

function ColumnControls({
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
}: ColumnControlsProps) {
  const [open, setOpen] = React.useState(false);

  const columns = React.useMemo(
    () => table.getAllLeafColumns().filter((column) => column.getCanHide()),
    [table]
  );

  const orderedColumns = React.useMemo(() => {
    const map = new Map(columns.map((column) => [column.id as string, column]));
    const ordered = columnOrder
      .map((id) => map.get(id))
      .filter((column): column is (typeof columns)[number] => Boolean(column));
    if (ordered.length === columns.length) return ordered;
    const missing = columns.filter(
      (column) => !columnOrder.includes(column.id as string)
    );
    return [...ordered, ...missing];
  }, [columns, columnOrder]);

  const fixedColumn = orderedColumns.find(
    (column) => column.id === PRIMARY_COLUMN_ID
  );
  const draggableColumns = orderedColumns.filter(
    (column) => column.id !== PRIMARY_COLUMN_ID
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = draggableColumns.findIndex(
      (column) => column.id === active.id
    );
    const newIndex = draggableColumns.findIndex(
      (column) => column.id === over.id
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(draggableColumns, oldIndex, newIndex);
      const finalOrder = fixedColumn
        ? [fixedColumn.id as string, ...reordered.map((c) => c.id as string)]
        : reordered.map((c) => c.id as string);
      onColumnOrderChange(finalOrder);
    }
  }

  interface SortableItemProps {
    column: (typeof columns)[number];
  }

  function SortableItem({ column }: SortableItemProps) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: column.id as string });

    const style: React.CSSProperties = {
      transform: transform ? CSS.Transform.toString(transform) : undefined,
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between py-2.5 px-2 group hover:bg-primary-foreground/50 rounded-lg cursor-pointer"
      >
        <div className="flex items-center gap-2 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab">
            <GripVerticalIcon className="size-4 text-primary/60" />
          </div>
          <Checkbox
            checked={column.getIsVisible()}
            onCheckedChange={(value) => column.toggleVisibility(!!value)}
            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer"
          />
          <span className="text-xs text-primary capitalize select-none">
            {(column.columnDef.meta as any)?.label || column.id}
          </span>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <EyeIcon className="size-3.5" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-lg bg-background border border-black/10 dark:border-white/5 w-[260px] p-2"
      >
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs text-primary/80 font-medium">
            Toggle columns
          </span>
        </div>
        <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 mb-2" />
        <div className="max-h-[400px] overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={draggableColumns.map((c) => c.id as string)}
              strategy={verticalListSortingStrategy}
            >
              {fixedColumn && (
                <div className="py-2.5 px-2 mb-1 border-b border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-4" />
                    <Checkbox
                      checked={fixedColumn.getIsVisible()}
                      disabled
                      className="rounded-lg border-black/5 dark:border-white/5"
                    />
                    <span className="text-xs text-primary/60 capitalize select-none">
                      {(fixedColumn.columnDef.meta as any)?.label ||
                        fixedColumn.id}{" "}
                      (fixed)
                    </span>
                  </div>
                </div>
              )}
              {draggableColumns.map((column) => (
                <SortableItem key={column.id} column={column} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
