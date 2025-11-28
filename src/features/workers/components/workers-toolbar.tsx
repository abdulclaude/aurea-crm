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
import { IconCalendarDays as DateRangeIcon } from "central-icons/IconCalendarDays";
import { IconLiveFull as StatusIcon } from "central-icons/IconLiveFull";
import { IconConstructionHelmet as RoleIcon } from "central-icons/IconConstructionHelmet";
import { IconEyeSlash as EyeIcon } from "central-icons/IconEyeSlash";
import { IconPound as RateIcon } from "central-icons/IconPound";
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
import { Checkbox } from "@/components/ui/checkbox";
import DateRangeFilter from "@/components/ui/date-range-filter";
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
import RangeSlider from "@/components/ui/range-slider";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

export interface WorkersToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  table: Table<any>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
  // Filter props
  selectedRoles?: string[];
  selectedStatus?: boolean | null;
  startDate?: Date;
  endDate?: Date;
  selectedRateMin?: number;
  selectedRateMax?: number;
  onApplyAllFilters?: (filters: {
    roles: string[];
    status: boolean | null;
    rateMin?: number;
    rateMax?: number;
  }) => void;
  onClearFilters?: () => void;
  onStartDateChange?: (start?: Date, end?: Date) => void;
}

const sortOptions = [
  { value: "createdAt.desc", label: "Newest first" },
  { value: "createdAt.asc", label: "Oldest first" },
  { value: "name.asc", label: "Name A → Z" },
  { value: "name.desc", label: "Name Z → A" },
  { value: "hourlyRate.desc", label: "Highest rate" },
  { value: "hourlyRate.asc", label: "Lowest rate" },
];

const PRIMARY_COLUMN_ID = "select";

const statusOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export function WorkersToolbar({
  search,
  onSearchChange,
  sortValue,
  onSortChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
  selectedRoles = [],
  selectedStatus,
  startDate,
  endDate,
  selectedRateMin,
  selectedRateMax,
  onApplyAllFilters,
  onClearFilters,
  onStartDateChange,
}: WorkersToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);

  const trpc = useTRPC();

  // Fetch all workers for filter options and preview
  const { data: allWorkersData } = useSuspenseQuery(
    trpc.workers.list.queryOptions({})
  );

  const allWorkers = React.useMemo(
    () => allWorkersData?.items || [],
    [allWorkersData]
  );

  // Staged filter states
  const [stagedRoles, setStagedRoles] = React.useState<string[]>(selectedRoles);
  const [stagedStatus, setStagedStatus] = React.useState<boolean | null>(
    selectedStatus ?? null
  );
  const [stagedRateMin, setStagedRateMin] = React.useState<number | undefined>(
    selectedRateMin
  );
  const [stagedRateMax, setStagedRateMax] = React.useState<number | undefined>(
    selectedRateMax
  );

  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Sync staged filters with props
  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    setStagedRoles(selectedRoles);
  }, [selectedRoles]);

  React.useEffect(() => {
    setStagedStatus(selectedStatus ?? null);
  }, [selectedStatus]);

  React.useEffect(() => {
    setStagedRateMin(selectedRateMin);
    setStagedRateMax(selectedRateMax);
  }, [selectedRateMin, selectedRateMax]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleToggleRole = (role: string) => {
    setStagedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleToggleStatus = (status: string) => {
    const boolValue = status === "true";
    setStagedStatus((prev) => (prev === boolValue ? null : boolValue));
  };

  // Get unique roles
  const uniqueRoles = React.useMemo(() => {
    const roleSet = new Set<string>();
    allWorkers.forEach((worker) => {
      if (worker.role) {
        roleSet.add(worker.role);
      }
    });
    return Array.from(roleSet).sort();
  }, [allWorkers]);

  // Calculate min/max for rate and dates + histograms
  const { minRate, maxRate, minDate, maxDate, rateHistogram } =
    React.useMemo(() => {
      const rates = allWorkers
        .map((worker) => (worker.hourlyRate ? Number(worker.hourlyRate) : null))
        .filter((r): r is number => r !== null);
      const dates = allWorkers
        .map((worker) => new Date(worker.createdAt))
        .filter((d) => !Number.isNaN(d.getTime()));

      const minR = rates.length > 0 ? Math.min(...rates) : 0;
      const maxR = rates.length > 0 ? Math.max(...rates) : 100;

      // Build histogram (40 bins)
      const numBins = 40;
      const rateHist = new Array(numBins).fill(0);

      // Rate histogram
      if (rates.length > 0 && maxR > minR) {
        rates.forEach((rate) => {
          const binIndex = Math.min(
            numBins - 1,
            Math.floor(((rate - minR) / (maxR - minR)) * numBins)
          );
          rateHist[binIndex]++;
        });
      }

      return {
        minRate: minR,
        maxRate: maxR,
        minDate:
          dates.length > 0
            ? new Date(Math.min(...dates.map((d) => d.getTime())))
            : new Date(2020, 0, 1),
        maxDate:
          dates.length > 0
            ? new Date(Math.max(...dates.map((d) => d.getTime())))
            : new Date(),
        rateHistogram: rateHist,
      };
    }, [allWorkers]);

  // Calculate preview count
  const previewCount = React.useMemo(() => {
    const filtered = allWorkers.filter((worker) => {
      // Role filter
      if (stagedRoles.length > 0) {
        if (!worker.role || !stagedRoles.includes(worker.role)) {
          return false;
        }
      }

      // Status filter
      if (stagedStatus !== null) {
        if (worker.isActive !== stagedStatus) {
          return false;
        }
      }

      // Rate filter
      if (
        typeof stagedRateMin === "number" ||
        typeof stagedRateMax === "number"
      ) {
        const rate = worker.hourlyRate ? Number(worker.hourlyRate) : 0;
        if (typeof stagedRateMin === "number" && rate < stagedRateMin) {
          return false;
        }
        if (typeof stagedRateMax === "number" && rate > stagedRateMax) {
          return false;
        }
      }

      return true;
    });

    return filtered.length;
  }, [allWorkers, stagedRoles, stagedStatus, stagedRateMin, stagedRateMax]);

  const hasFiltersApplied =
    selectedRoles.length > 0 ||
    selectedStatus !== null ||
    typeof selectedRateMin === "number" ||
    typeof selectedRateMax === "number";

  return (
    <div className="flex justify-between w-full items-center">
      <div className="flex items-center gap-2 w-full">
        {/* Search with filters inside */}

        <div className="flex w-128 items-center bg-background transition duration-250 relative hover:bg-primary-foreground/50 hover:text-black rounded-lg h-8.5">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />

          <Input
            placeholder="Search workers by name, email, role..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className=" text-xs px-0 border-none bg-transparent! hover:bg-transparent w-128 pl-8"
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

              {/* Role Filter */}
              {uniqueRoles.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <RoleIcon className="size-4" />
                    Role
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {uniqueRoles.map((role) => (
                        <div
                          key={role}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedRoles.includes(role)}
                            onCheckedChange={() => handleToggleRole(role)}
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">{role}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedRoles([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Status Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <StatusIcon className="size-4" />
                  Status
                </DropdownMenuSubTrigger>
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
                          checked={
                            stagedStatus !== null &&
                            stagedStatus === (status.value === "true")
                          }
                          onCheckedChange={() =>
                            handleToggleStatus(status.value)
                          }
                          className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground  data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                        />
                        <span className="select-none">{status.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button
                      className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStagedStatus(null);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Hourly Rate Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <RateIcon className="size-4" />
                  Hourly Rate
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  <RangeSlider
                    label=""
                    mode="number"
                    min={minRate}
                    max={maxRate}
                    minPrefix="$"
                    maxPrefix="$"
                    value={[stagedRateMin ?? minRate, stagedRateMax ?? maxRate]}
                    onChange={([min, max]) => {
                      setStagedRateMin(min === minRate ? undefined : min);
                      setStagedRateMax(max === maxRate ? undefined : max);
                    }}
                    histogramData={rateHistogram}
                    bins={40}
                    minInputLabel="Minimum hourly rate"
                    maxInputLabel="Maximum hourly rate"
                    showCountButton={false}
                  />
                  <div className="pt-2 flex gap-2">
                    <Button
                      className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStagedRateMin(undefined);
                        setStagedRateMax(undefined);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Date Range Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <DateRangeIcon className="size-4" />
                  Date Joined
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  <DateRangeFilter
                    minDate={minDate}
                    maxDate={maxDate}
                    valueStart={startDate}
                    valueEnd={endDate}
                    onChange={(start, end) => onStartDateChange?.(start, end)}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <div className="pt-1">
                <Button
                  variant="filter"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyAllFilters?.({
                      roles: stagedRoles,
                      status: stagedStatus,
                      rateMin: stagedRateMin,
                      rateMax: stagedRateMax,
                    });
                    setFiltersOpen(false);
                  }}
                >
                  {`Show ${previewCount} workers`}
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sort dropdown */}
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
      <SelectTrigger className="gap-2 rounded-lg bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-primary/80 dark:text-white font-normal h-8.5!">
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
            className="w-full justify-center px-4! py-2 text-left text-xs text-primary/80 font-normal dark:text-white transition bg-background hover:bg-primary/15 hover:text-black dark:hover:text-white rounded-lg border-black/15 dark:border-white/5 "
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
