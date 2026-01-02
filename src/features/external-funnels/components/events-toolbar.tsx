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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import DateRangeFilter from "@/components/ui/date-range-filter";
import { cn } from "@/lib/utils";
import { ChartTableToggle } from "@/components/chart-table-toggle";

import { IconCalendarEdit as TimestampIcon } from "central-icons/IconCalendarEdit";
import { Activity, User } from "lucide-react";

export interface EventsToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  table: Table<any>;
  // View toggle
  view?: "chart" | "table";
  onViewChange?: (view: "chart" | "table") => void;
  columnVisibility: VisibilityState;
  columnOrder?: ColumnOrderState;
  onColumnOrderChange?: (order: ColumnOrderState) => void;
  initialColumnOrder?: ColumnOrderState;
  // Event type filter
  eventTypes?: string[];
  selectedEventTypes?: string[];
  onToggleEventType?: (eventType: string) => void;
  // Device type filter
  deviceTypes?: string[];
  selectedDeviceTypes?: string[];
  onToggleDeviceType?: (deviceType: string) => void;
  // User filter
  users?: Array<{ identifier: string; displayName: string }>;
  selectedUsers?: string[];
  onToggleUser?: (user: string) => void;
  // Conversion filter
  showConversionsOnly?: boolean;
  onToggleConversionsOnly?: () => void;
  // Date filters
  timestampStart?: Date;
  timestampEnd?: Date;
  onTimestampChange?: (start?: Date, end?: Date) => void;
  // Sort
  sortValue?: string;
  onSortChange?: (value: string) => void;
  // Clear filters
  onClearFilters?: () => void;
}

const sortOptions = [
  { value: "timestamp.desc", label: "Most recent" },
  { value: "timestamp.asc", label: "Oldest first" },
  { value: "eventName.asc", label: "Event name A → Z" },
  { value: "eventName.desc", label: "Event name Z → A" },
];

const PRIMARY_COLUMN_ID = "event";

export function EventsToolbar({
  search,
  onSearchChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
  view,
  onViewChange,
  eventTypes = [],
  selectedEventTypes = [],
  onToggleEventType,
  deviceTypes = [],
  selectedDeviceTypes = [],
  onToggleDeviceType,
  users = [],
  selectedUsers = [],
  onToggleUser,
  showConversionsOnly = false,
  onToggleConversionsOnly,
  timestampStart,
  timestampEnd,
  onTimestampChange,
  sortValue = "timestamp.desc",
  onSortChange,
  onClearFilters,
}: EventsToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Staged filters for preview
  const [stagedEventTypes, setStagedEventTypes] =
    React.useState<string[]>(selectedEventTypes);
  const [stagedDeviceTypes, setStagedDeviceTypes] =
    React.useState<string[]>(selectedDeviceTypes);
  const [stagedUsers, setStagedUsers] = React.useState<string[]>(selectedUsers);
  const [stagedConversionsOnly, setStagedConversionsOnly] =
    React.useState<boolean>(showConversionsOnly);

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    setStagedEventTypes(selectedEventTypes);
  }, [selectedEventTypes]);

  React.useEffect(() => {
    setStagedDeviceTypes(selectedDeviceTypes);
  }, [selectedDeviceTypes]);

  React.useEffect(() => {
    setStagedUsers(selectedUsers);
  }, [selectedUsers]);

  React.useEffect(() => {
    setStagedConversionsOnly(showConversionsOnly);
  }, [showConversionsOnly]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleToggleEventType = (value: string) => {
    setStagedEventTypes((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleToggleDeviceType = (value: string) => {
    setStagedDeviceTypes((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleToggleUser = (value: string) => {
    setStagedUsers((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const hasFiltersApplied =
    selectedEventTypes.length > 0 ||
    selectedDeviceTypes.length > 0 ||
    selectedUsers.length > 0 ||
    showConversionsOnly ||
    timestampStart ||
    timestampEnd;

  return (
    <div className="flex justify-between w-full items-center">
      <div className="flex items-center w-full">
        {/* Search with filters inside */}
        <div className="flex w-128 items-center bg-background transition duration-250 relative hover:bg-primary-foreground/50 hover:text-black rounded-none h-10!">
          <SearchIcon className="size-3.5 absolute z-10 left-4 top-1/2 -translate-y-1/2 text-primary/50" />

          <Input
            placeholder="Search events..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="text-xs px-0 ring-0 shadow-none border-x bg-transparent! hover:bg-transparent w-128 pl-10 rounded-none! h-10!"
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

              {/* Event Type Filter */}
              {eventTypes.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Activity className="size-4" />
                    Event Type
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {eventTypes.map((eventType) => (
                        <div
                          key={eventType}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedEventTypes.includes(eventType)}
                            onCheckedChange={() =>
                              handleToggleEventType(eventType)
                            }
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none capitalize">
                            {eventType.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedEventTypes([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Device Type Filter */}
              {deviceTypes.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Activity className="size-4" />
                    Device Type
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {deviceTypes.map((deviceType) => (
                        <div
                          key={deviceType}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedDeviceTypes.includes(deviceType)}
                            onCheckedChange={() =>
                              handleToggleDeviceType(deviceType)
                            }
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none capitalize">
                            {deviceType}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedDeviceTypes([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* User Filter */}
              {users.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <User className="size-4" />
                    User
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {users.map((user) => (
                        <div
                          key={user.identifier}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedUsers.includes(user.identifier)}
                            onCheckedChange={() =>
                              handleToggleUser(user.identifier)
                            }
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">
                            {user.displayName}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedUsers([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Conversions Only Filter */}
              <div className="px-4 py-3 hover:brightness-120 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={stagedConversionsOnly}
                    onCheckedChange={() =>
                      setStagedConversionsOnly(!stagedConversionsOnly)
                    }
                    className="rounded-lg border-black/5 dark:border-white/5"
                  />
                  <span className="text-xs text-primary">
                    Show conversions only
                  </span>
                </div>
              </div>

              {/* Timestamp Date Filter */}
              {onTimestampChange && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <TimestampIcon className="size-4" />
                    Time Range
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent alignOffset={-5}>
                    <DateRangeFilter
                      minDate={new Date(2020, 0, 1)}
                      maxDate={new Date()}
                      valueStart={timestampStart}
                      valueEnd={timestampEnd}
                      onChange={(start, end) => onTimestampChange(start, end)}
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Apply/Clear Buttons */}
              <div className="pt-1 px-2 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStagedEventTypes([]);
                    setStagedDeviceTypes([]);
                    setStagedUsers([]);
                    setStagedConversionsOnly(false);
                    onClearFilters?.();
                    setFiltersOpen(false);
                  }}
                >
                  Clear all
                </Button>
                <Button
                  variant="filter"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Apply staged filters
                    if (
                      onToggleEventType &&
                      stagedEventTypes !== selectedEventTypes
                    ) {
                      stagedEventTypes.forEach(onToggleEventType);
                    }
                    if (
                      onToggleDeviceType &&
                      stagedDeviceTypes !== selectedDeviceTypes
                    ) {
                      stagedDeviceTypes.forEach(onToggleDeviceType);
                    }
                    if (onToggleUser && stagedUsers !== selectedUsers) {
                      stagedUsers.forEach(onToggleUser);
                    }
                    if (
                      onToggleConversionsOnly &&
                      stagedConversionsOnly !== showConversionsOnly
                    ) {
                      onToggleConversionsOnly();
                    }
                    setFiltersOpen(false);
                  }}
                >
                  Apply filters
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sort dropdown */}
        {onSortChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10! rounded-none ring-0 shadow-none border-r"
              >
                Sort by
                <ChevronDown className="size-3.5 text-primary/60 dark:text-white/60 mt-0.5" />
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
        )}
      </div>

      {/* View toggle and Column visibility on the right */}
      <div className="flex gap-0 items-center">
        {view && onViewChange && (
          <ChartTableToggle view={view} onViewChange={onViewChange} />
        )}

        {columnOrder && onColumnOrderChange && initialColumnOrder && (
          <ColumnControls
            table={table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={onColumnOrderChange}
            initialColumnOrder={initialColumnOrder}
          />
        )}
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
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const reorderableIds = draggableColumns.map(
        (column) => column.id as string
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
    [draggableColumns, onColumnOrderChange]
  );

  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value="columns"
      onValueChange={() => {}}
    >
      <SelectTrigger
        className="gap-2 rounded-none bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-primary/80 dark:text-white font-normal h-10! shadow-none ring-0 border-r"
        chevron={false}
      >
        <EyeIcon className="size-3.5 dark:text-white/60" />
        <span className="flex items-center gap-2">Columns</span>
      </SelectTrigger>

      <SelectContent className="w-64 border-black/10 dark:border-white/5 bg-background p-0 shadow-2xl backdrop-blur rounded-lg text-primary/80">
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
                    (fixedColumn.columnDef.meta as any)?.label ?? fixedColumn.id
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
                    label={(column.columnDef.meta as any)?.label ?? column.id}
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

type SortableColumnRowProps = {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
};

function SortableColumnRow({
  id,
  label,
  checked,
  onToggle,
}: SortableColumnRowProps) {
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
      <button
        type="button"
        className={cn(
          "flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition hover:bg-primary-foreground/50 hover:text-black dark:hover:text-white",
          !checked && "text-primary/80 dark:text-white/30"
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
            checked ? "opacity-100" : "opacity-0"
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
