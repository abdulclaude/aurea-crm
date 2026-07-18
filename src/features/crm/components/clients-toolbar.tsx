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
import { useSuspenseQuery } from "@tanstack/react-query";
import type {
  ColumnOrderState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";
import { IconEyeSlash as EyeIcon } from "central-icons/IconEyeSlash";
import { IconSettingsSliderThree as FilterIcon } from "central-icons/IconSettingsSliderThree";

import { IconContacts as ClientTypeIcon } from "central-icons/IconContacts";
import { IconCalenderAdd as CreatedAtIcon } from "central-icons/IconCalenderAdd";
import { IconLiveActivity as LastActivityIcon } from "central-icons/IconLiveActivity";
import { IconCalendarEdit as LastUpdatedIcon } from "central-icons/IconCalendarEdit";

import {
  CheckIcon,
  ChevronDown,
  GripVerticalIcon,
  SearchIcon,
} from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { useDebouncedCallback } from "use-debounce";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

export interface ClientsToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  selectedTypes: string[];
  selectedTags: string[];
  onApplyAllFilters: (types: string[], tags: string[]) => void;
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
  lastActivityStart?: Date;
  lastActivityEnd?: Date;
  onLastActivityChange?: (start?: Date, end?: Date) => void;
  updatedAtStart?: Date;
  updatedAtEnd?: Date;
  onUpdatedAtChange?: (start?: Date, end?: Date) => void;
  scope?: "agency" | "all-clients";
  selectedLocationId?: string;
  onLocationChange?: (locationId: string) => void;
}

const clientTypeOptions = ["LEAD", "PROSPECT", "CUSTOMER", "CHURN", "CLOSED"];

const sortOptions = [
  { value: "name.asc", label: "Name A → Z" },
  { value: "name.desc", label: "Name Z → A" },
  { value: "companyName.asc", label: "Company A → Z" },
  { value: "companyName.desc", label: "Company Z → A" },
  { value: "createdAt.desc", label: "Newest first" },
  { value: "createdAt.asc", label: "Oldest first" },
  { value: "updatedAt.desc", label: "Recently updated" },
  { value: "updatedAt.asc", label: "Oldest updates" },
];

const PRIMARY_COLUMN_ID = "name";

function selectedDateRange(start?: Date, end?: Date): DateRange | undefined {
  return start || end ? { from: start, to: end } : undefined;
}

export function ClientsToolbar({
  search,
  onSearchChange,
  selectedTypes,
  selectedTags,
  onApplyAllFilters,
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
  lastActivityStart,
  lastActivityEnd,
  onLastActivityChange,
  updatedAtStart,
  updatedAtEnd,
  onUpdatedAtChange,
  scope = "agency",
  selectedLocationId = "",
  onLocationChange,
}: ClientsToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const [tempSelectedTypes, setTempSelectedTypes] =
    React.useState<string[]>(selectedTypes);
  const [tempSelectedTags, setTempSelectedTags] =
    React.useState<string[]>(selectedTags);
  const [tempCreatedAt, setTempCreatedAt] = React.useState<DateRange | undefined>(
    selectedDateRange(createdAtStart, createdAtEnd),
  );
  const [tempLastActivity, setTempLastActivity] = React.useState<
    DateRange | undefined
  >(selectedDateRange(lastActivityStart, lastActivityEnd));
  const [tempUpdatedAt, setTempUpdatedAt] = React.useState<
    DateRange | undefined
  >(selectedDateRange(updatedAtStart, updatedAtEnd));
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const trpc = useTRPC();

  // Fetch available clients/locations for "all-clients" scope
  const { data: clients = [] } = useSuspenseQuery(
    trpc.organizations.getClients.queryOptions(),
  );

  // Fetch ALL clients (unfiltered) for preview calculation
  const { data: allClientsData } = useSuspenseQuery(
    trpc.clients.list.queryOptions({}),
  );

  // Fetch date range for filters
  const { data: dateRange } = useSuspenseQuery(
    trpc.clients.dateRange.queryOptions(),
  );

  const allClients = React.useMemo(
    () => allClientsData?.items || [],
    [allClientsData],
  );

  // Get unique tags from all clients
  const availableTags = React.useMemo(() => {
    const tags = new Set<string>();
    allClients.forEach((client) => {
      const clientTags = client.tags || [];
      clientTags.forEach((tag: string) => {
        tags.add(tag);
      });
    });
    return Array.from(tags).sort();
  }, [allClients]);

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    setTempSelectedTypes(selectedTypes);
  }, [selectedTypes]);

  React.useEffect(() => {
    setTempSelectedTags(selectedTags);
  }, [selectedTags]);

  React.useEffect(() => {
    setTempCreatedAt(selectedDateRange(createdAtStart, createdAtEnd));
  }, [createdAtEnd, createdAtStart]);

  React.useEffect(() => {
    setTempLastActivity(
      selectedDateRange(lastActivityStart, lastActivityEnd),
    );
  }, [lastActivityEnd, lastActivityStart]);

  React.useEffect(() => {
    setTempUpdatedAt(selectedDateRange(updatedAtStart, updatedAtEnd));
  }, [updatedAtEnd, updatedAtStart]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleToggleType = (value: string) => {
    setTempSelectedTypes((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const handleToggleTag = (value: string) => {
    setTempSelectedTags((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const handleDateRangeSelection = (
    current: DateRange | undefined,
    next: DateRange | undefined,
    setRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>,
    onRangeChange?: (start?: Date, end?: Date) => void,
  ) => {
    if (!next) {
      setRange(undefined);
      onRangeChange?.();
      return;
    }

    if (!current?.from || current.to) {
      setRange({ from: next.from, to: undefined });
      return;
    }

    setRange(next);
    if (next.from && next.to) {
      onRangeChange?.(next.from, next.to);
    }
  };

  const hasFiltersApplied =
    tempSelectedTypes.length > 0 ||
    tempSelectedTags.length > 0 ||
    Boolean(tempCreatedAt?.from) ||
    Boolean(tempLastActivity?.from) ||
    Boolean(tempUpdatedAt?.from);

  // Calculate preview count considering ALL staged filters combined
  const previewCount = React.useMemo(() => {
    const filtered = allClients.filter((client) => {
      // Check types filter (if any selected)
      if (tempSelectedTypes.length > 0) {
        if (!tempSelectedTypes.includes(client.type)) {
          return false;
        }
      }

      // Check tags filter (if any selected)
      if (tempSelectedTags.length > 0) {
        const clientTags = client.tags || [];
        const hasMatchingTag = tempSelectedTags.some((tag: string) =>
          clientTags.includes(tag),
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });

    return filtered.length;
  }, [allClients, tempSelectedTypes, tempSelectedTags]);

  return (
    <div className="w-full min-w-0 py-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {/* Search with filters inside */}
        <div className="relative flex h-8.5 min-w-64 basis-full flex-1 items-center rounded-lg bg-background transition duration-250 hover:bg-primary-foreground/50 hover:text-black sm:max-w-128 sm:basis-auto">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />

          <Input
            placeholder="Search members by name, email, company..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full border-none bg-transparent! px-0 pl-8 text-xs hover:bg-transparent"
          />

          <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Filter clients"
                className="text-[11px] bg-transparent hover:bg-transparent border-none absolute right-0"
              >
                <FilterIcon className="text-primary/80 dark:text-white/60 size-4 hover:text-black" />
                {hasFiltersApplied && (
                  <span className="absolute -top-1 -right-1 size-3 rounded-full bg-blue-500 border-2 border-white" />
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

              {/* Client Type Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs px-3 py-3 hover:bg-primary-foreground/50 hover:text-black rounded-lg">
                  <ClientTypeIcon className="size-4" />
                  Member Type
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-1 w-[280px] ml-2.5"
                  alignOffset={-5}
                >
                  <div className="max-h-64 overflow-auto pr-1">
                    {clientTypeOptions.map((option) => {
                      const selected = tempSelectedTypes.includes(option);
                      return (
                        <div
                          key={option}
                          className="flex items-center gap-2 pt-3 pb-2 px-2 text-xs cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => handleToggleType(option)}
                            className="rounded-lg border-black/10 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground/50 hover:text-black data-[state=checked]:bg-primary-foreground/50 data-[state=checked]:text-black"
                          />
                          <span className="select-none">
                            {option.charAt(0) + option.slice(1).toLowerCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-3 flex gap-2">
                    <Button
                      className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempSelectedTypes([]);
                      }}
                    >
                      Clear
                    </Button>
                    {/* <Button
                      className="flex-1 border border-white/5 bg-[#202e32] hover:bg-[#202e32] hover:bg-accent  text-xs text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyTypes(tempSelectedTypes);
                        setFiltersOpen(false);
                      }}
                    >
                      {`Show ${previewCount} clients`}
                    </Button> */}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Tags Filter */}
              {availableTags.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs px-4 py-3 hover:bg-accent rounded-lg">
                    Tags
                  </DropdownMenuSubTrigger>

                  <DropdownMenuSubContent
                    className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {availableTags.map((tag) => {
                        const selected = tempSelectedTags.includes(tag);
                        return (
                          <div
                            key={tag}
                            className="flex items-center gap-2 py-2 text-xs cursor-pointer rounded-lg group"
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => handleToggleTag(tag)}
                              className="rounded-lg border-black/10 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground/50 hover:text-black data-[state=checked]:bg-primary-foreground/50 data-[state=checked]:text-black"
                            />
                            <span className="select-none">{tag}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-3 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempSelectedTags([]);
                        }}
                      >
                        Clear
                      </Button>
                      {/* <Button
                        className="flex-1 border border-white/5 bg-[#202e32] hover:bg-[#202e32] hover:bg-accent  text-xs text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyTags(tempSelectedTags);
                          setFiltersOpen(false);
                        }}
                      >
                        {`Show ${previewCount} clients`}
                      </Button> */}
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Created At Date Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs px-3 py-3 hover:bg-primary-foreground! hover:text-black rounded-lg">
                  <CreatedAtIcon className="size-4" />
                  Created Date
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="ml-2.5 w-80 rounded-lg border border-black/10 bg-background p-2 dark:border-white/5"
                  alignOffset={-5}
                >
                  <DateRangePicker
                    minDate={dateRange?.minDate || new Date(2020, 0, 1)}
                    maxDate={dateRange?.maxDate || new Date()}
                    value={tempCreatedAt}
                    onChange={(range) =>
                      handleDateRangeSelection(
                        tempCreatedAt,
                        range,
                        setTempCreatedAt,
                        onCreatedAtChange,
                      )
                    }
                    placeholder="Select created date range"
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Last Activity Date Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs px-3 py-3 hover:bg-primary-foreground! hover:text-black rounded-lg">
                  <LastActivityIcon className="size-4" />
                  Last Activity
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="ml-2.5 w-80 rounded-lg border border-black/10 bg-background p-2 dark:border-white/5"
                  alignOffset={-5}
                >
                  <DateRangePicker
                    minDate={dateRange?.minDate || new Date(2020, 0, 1)}
                    maxDate={dateRange?.maxDate || new Date()}
                    value={tempLastActivity}
                    onChange={(range) =>
                      handleDateRangeSelection(
                        tempLastActivity,
                        range,
                        setTempLastActivity,
                        onLastActivityChange,
                      )
                    }
                    placeholder="Select activity date range"
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Updated At Date Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs px-3 py-3 hover:bg-primary-foreground! hover:text-black rounded-lg">
                  <LastUpdatedIcon className="size-4" />
                  Last Updated
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="ml-2.5 w-80 rounded-lg border border-black/10 bg-background p-2 dark:border-white/5"
                  alignOffset={-5}
                >
                  <DateRangePicker
                    minDate={dateRange?.minDate || new Date(2020, 0, 1)}
                    maxDate={dateRange?.maxDate || new Date()}
                    value={tempUpdatedAt}
                    onChange={(range) =>
                      handleDateRangeSelection(
                        tempUpdatedAt,
                        range,
                        setTempUpdatedAt,
                        onUpdatedAtChange,
                      )
                    }
                    placeholder="Select updated date range"
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <div className=" pt-1">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyAllFilters(tempSelectedTypes, tempSelectedTags);
                    setFiltersOpen(false);
                  }}
                  variant="filter"
                >
                  <span className="drop-shadow-sm">{`Show ${previewCount} members`}</span>
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Client Filter - Only show for "all-clients" scope */}
        {scope === "all-clients" && onLocationChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8.5! min-w-32">
                {selectedLocationId
                  ? clients.find(
                      (c: any) => c.locationId === selectedLocationId,
                    )?.name || "Select location"
                  : "All locations"}
                <ChevronDown className="size-3 text-primary/80 dark:text-white/60" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              className="bg-background border border-black/10 dark:border-white/5 w-[280px] p-1 max-h-[400px] overflow-auto"
            >
              <DropdownMenuCheckboxItem
                checked={selectedLocationId === ""}
                onSelect={() => onLocationChange("")}
                className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black cursor-pointer"
              >
                All locations
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-1" />

              {clients.map((client: any) => (
                <DropdownMenuCheckboxItem
                  key={client.locationId}
                  checked={selectedLocationId === client.locationId}
                  onSelect={() => onLocationChange(client.locationId)}
                  className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black cursor-pointer"
                >
                  {client.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-8.5!">
              Sort by
              <ChevronDown className="size-3 text-primary/80 dark:text-white/60" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="bg-background border border-black/10 dark:border-white/5 w-[220px] p-1"
          >
            {sortOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={sortValue === option.value}
                onSelect={() => {
                  onSortChange(option.value);
                }}
                className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black cursor-pointer"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Column visibility and ordering on the right */}
        <div className="ml-auto flex shrink-0 gap-1">
          <ColumnControls
            table={table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={onColumnOrderChange}
            initialColumnOrder={initialColumnOrder}
          />
        </div>
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
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
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
        <EyeIcon className="size-3" />
        <span className="flex items-center gap-2">Columns</span>
      </SelectTrigger>

      <SelectContent
        className="w-64 border-black/10 dark:border-white/5 bg-background p-0 shadow-2xl backdrop-blur text-primary/80"
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
            className="w-full justify-center px-4! py-2 text-left text-xs text-black font-normal dark:text-white transition bg-background hover:bg-primary-foreground/50 hover:text-black dark:hover:text-white rounded-lg border border-black/15 dark:border-white/5 "
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
        <span className="flex-1 truncate">{label}</span>
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
