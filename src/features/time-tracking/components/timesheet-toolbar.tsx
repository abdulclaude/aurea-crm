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
import { IconFilePdf as PDFIcon } from "central-icons/IconFilePdf";
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
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import RangeSlider from "@/components/ui/range-slider";
import DateRangeFilter from "@/components/ui/date-range-filter";
import { cn } from "@/lib/utils";
import { TimeLogStatus } from "@prisma/client";

export interface TimesheetToolbarProps {
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
  selectedWorkers?: string[];
  selectedDeals?: string[];
  selectedStatuses?: string[];
  startDate?: Date;
  endDate?: Date;
  selectedDurationMin?: number;
  selectedDurationMax?: number;
  selectedAmountMin?: number;
  selectedAmountMax?: number;
  onApplyAllFilters?: (filters: {
    workers: string[];
    deals: string[];
    statuses: string[];
    durationMin?: number;
    durationMax?: number;
    amountMin?: number;
    amountMax?: number;
  }) => void;
  onClearFilters?: () => void;
  onStartDateChange?: (start?: Date, end?: Date) => void;
  // Export props
  onExportPDF?: () => void;
}

const sortOptions = [
  { value: "date.desc", label: "Newest first" },
  { value: "date.asc", label: "Oldest first" },
  { value: "duration.desc", label: "Longest duration" },
  { value: "duration.asc", label: "Shortest duration" },
  { value: "totalAmount.desc", label: "Highest amount" },
  { value: "totalAmount.asc", label: "Lowest amount" },
];

const PRIMARY_COLUMN_ID = "worker";

const statusOptions = [
  { value: TimeLogStatus.DRAFT, label: "Working" },
  { value: TimeLogStatus.SUBMITTED, label: "Submitted" },
  { value: TimeLogStatus.APPROVED, label: "Approved" },
  { value: TimeLogStatus.REJECTED, label: "Rejected" },
  { value: TimeLogStatus.INVOICED, label: "Invoiced" },
];

export function TimesheetToolbar({
  search,
  onSearchChange,
  sortValue,
  onSortChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
  selectedWorkers = [],
  selectedDeals = [],
  selectedStatuses = [],
  startDate,
  endDate,
  selectedDurationMin,
  selectedDurationMax,
  selectedAmountMin,
  selectedAmountMax,
  onApplyAllFilters,
  onClearFilters,
  onStartDateChange,
  onExportPDF,
}: TimesheetToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);

  const trpc = useTRPC();

  // Fetch all time logs for filter options and preview
  const { data: allTimeLogsData } = useSuspenseQuery(
    trpc.timeTracking.list.queryOptions({})
  );

  const allTimeLogs = React.useMemo(
    () => allTimeLogsData?.items || [],
    [allTimeLogsData]
  );

  // Staged filter states
  const [stagedWorkers, setStagedWorkers] =
    React.useState<string[]>(selectedWorkers);
  const [stagedDeals, setStagedDeals] = React.useState<string[]>(selectedDeals);
  const [stagedStatuses, setStagedStatuses] =
    React.useState<string[]>(selectedStatuses);
  const [stagedDurationMin, setStagedDurationMin] = React.useState<
    number | undefined
  >(selectedDurationMin);
  const [stagedDurationMax, setStagedDurationMax] = React.useState<
    number | undefined
  >(selectedDurationMax);
  const [stagedAmountMin, setStagedAmountMin] = React.useState<
    number | undefined
  >(selectedAmountMin);
  const [stagedAmountMax, setStagedAmountMax] = React.useState<
    number | undefined
  >(selectedAmountMax);

  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Sync staged filters with props
  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    setStagedWorkers(selectedWorkers);
  }, [selectedWorkers]);

  React.useEffect(() => {
    setStagedDeals(selectedDeals);
  }, [selectedDeals]);

  React.useEffect(() => {
    setStagedStatuses(selectedStatuses);
  }, [selectedStatuses]);

  React.useEffect(() => {
    setStagedDurationMin(selectedDurationMin);
    setStagedDurationMax(selectedDurationMax);
  }, [selectedDurationMin, selectedDurationMax]);

  React.useEffect(() => {
    setStagedAmountMin(selectedAmountMin);
    setStagedAmountMax(selectedAmountMax);
  }, [selectedAmountMin, selectedAmountMax]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleToggleWorker = (workerId: string) => {
    setStagedWorkers((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleToggleDeal = (dealId: string) => {
    setStagedDeals((prev) =>
      prev.includes(dealId)
        ? prev.filter((id) => id !== dealId)
        : [...prev, dealId]
    );
  };

  const handleToggleStatus = (status: string) => {
    setStagedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // Get unique workers and deals
  const uniqueWorkers = React.useMemo(() => {
    const workerMap = new Map<string, { id: string; name: string }>();
    allTimeLogs.forEach((log) => {
      const worker = log.worker || log.contact;
      if (worker) {
        workerMap.set(worker.id, {
          id: worker.id,
          name: worker.name || "Unknown",
        });
      }
    });
    return Array.from(workerMap.values());
  }, [allTimeLogs]);

  const uniqueDeals = React.useMemo(() => {
    const dealMap = new Map<string, { id: string; name: string }>();
    allTimeLogs.forEach((log) => {
      if (log.deal) {
        dealMap.set(log.deal.id, { id: log.deal.id, name: log.deal.name });
      }
    });
    return Array.from(dealMap.values());
  }, [allTimeLogs]);

  // Calculate min/max for duration, amount, and dates
  const { minDuration, maxDuration, minAmount, maxAmount, minDate, maxDate } =
    React.useMemo(() => {
      const durations = allTimeLogs
        .map((log) => log.duration)
        .filter((d): d is number => d !== null && d !== undefined);
      const amounts = allTimeLogs
        .map((log) => (log.totalAmount ? Number(log.totalAmount) : null))
        .filter((a): a is number => a !== null);
      const dates = allTimeLogs
        .map((log) => new Date(log.startTime))
        .filter((d) => !isNaN(d.getTime()));

      return {
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 480, // 8 hours
        minAmount: amounts.length > 0 ? Math.min(...amounts) : 0,
        maxAmount: amounts.length > 0 ? Math.max(...amounts) : 1000,
        minDate:
          dates.length > 0
            ? new Date(Math.min(...dates.map((d) => d.getTime())))
            : new Date(2020, 0, 1),
        maxDate:
          dates.length > 0
            ? new Date(Math.max(...dates.map((d) => d.getTime())))
            : new Date(),
      };
    }, [allTimeLogs]);

  // Calculate preview count
  const previewCount = React.useMemo(() => {
    const filtered = allTimeLogs.filter((log) => {
      // Worker filter
      if (stagedWorkers.length > 0) {
        const workerId = log.worker?.id || log.contact?.id;
        if (!workerId || !stagedWorkers.includes(workerId)) {
          return false;
        }
      }

      // Deal filter
      if (stagedDeals.length > 0) {
        if (!log.deal || !stagedDeals.includes(log.deal.id)) {
          return false;
        }
      }

      // Status filter
      if (stagedStatuses.length > 0) {
        if (!stagedStatuses.includes(log.status)) {
          return false;
        }
      }

      // Duration filter
      if (
        typeof stagedDurationMin === "number" ||
        typeof stagedDurationMax === "number"
      ) {
        const duration = log.duration ?? 0;
        if (
          typeof stagedDurationMin === "number" &&
          duration < stagedDurationMin
        ) {
          return false;
        }
        if (
          typeof stagedDurationMax === "number" &&
          duration > stagedDurationMax
        ) {
          return false;
        }
      }

      // Amount filter
      if (
        typeof stagedAmountMin === "number" ||
        typeof stagedAmountMax === "number"
      ) {
        const amount = log.totalAmount ? Number(log.totalAmount) : 0;
        if (typeof stagedAmountMin === "number" && amount < stagedAmountMin) {
          return false;
        }
        if (typeof stagedAmountMax === "number" && amount > stagedAmountMax) {
          return false;
        }
      }

      return true;
    });

    return filtered.length;
  }, [
    allTimeLogs,
    stagedWorkers,
    stagedDeals,
    stagedStatuses,
    stagedDurationMin,
    stagedDurationMax,
    stagedAmountMin,
    stagedAmountMax,
  ]);

  const hasFiltersApplied =
    selectedWorkers.length > 0 ||
    selectedDeals.length > 0 ||
    selectedStatuses.length > 0 ||
    typeof selectedDurationMin === "number" ||
    typeof selectedDurationMax === "number" ||
    typeof selectedAmountMin === "number" ||
    typeof selectedAmountMax === "number";

  return (
    <div className="flex justify-between w-full items-center">
      <div className="flex items-center gap-2 w-full">
        {/* Search with filters inside */}
        <div className="flex w-128 items-center bg-background transition duration-250 relative hover:bg-primary-foreground/50 hover:text-black rounded-lg h-8.5">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />

          <Input
            placeholder="Search time logs by worker, title, or job..."
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

              {/* Worker Filter */}
              {uniqueWorkers.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Worker</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {uniqueWorkers.map((worker) => (
                        <div
                          key={worker.id}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedWorkers.includes(worker.id)}
                            onCheckedChange={() =>
                              handleToggleWorker(worker.id)
                            }
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground hover:brightness-120 data-[state=checked]:brightness-120 data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">{worker.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedWorkers([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Deal/Job Filter */}
              {uniqueDeals.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Job/Deal</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {uniqueDeals.map((deal) => (
                        <div
                          key={deal.id}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedDeals.includes(deal.id)}
                            onCheckedChange={() => handleToggleDeal(deal.id)}
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground hover:brightness-120 data-[state=checked]:brightness-120 data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">{deal.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedDeals([]);
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
                          className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground hover:brightness-120 data-[state=checked]:brightness-120 data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
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
                        setStagedStatuses([]);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Duration Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Duration</DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  <RangeSlider
                    label=""
                    mode="number"
                    min={minDuration}
                    max={maxDuration}
                    suffix=" min"
                    value={[
                      stagedDurationMin ?? minDuration,
                      stagedDurationMax ?? maxDuration,
                    ]}
                    onChange={([min, max]) => {
                      setStagedDurationMin(
                        min === minDuration ? undefined : min
                      );
                      setStagedDurationMax(
                        max === maxDuration ? undefined : max
                      );
                    }}
                    bins={100}
                    minInputLabel="Minimum duration (minutes)"
                    maxInputLabel="Maximum duration (minutes)"
                    showCountButton={false}
                  />
                  <div className="pt-2 flex gap-2">
                    <Button
                      className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStagedDurationMin(undefined);
                        setStagedDurationMax(undefined);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Amount Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Amount</DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  <RangeSlider
                    label=""
                    mode="number"
                    min={minAmount}
                    max={maxAmount}
                    minPrefix="$"
                    maxPrefix="$"
                    value={[
                      stagedAmountMin ?? minAmount,
                      stagedAmountMax ?? maxAmount,
                    ]}
                    onChange={([min, max]) => {
                      setStagedAmountMin(min === minAmount ? undefined : min);
                      setStagedAmountMax(max === maxAmount ? undefined : max);
                    }}
                    bins={100}
                    minInputLabel="Minimum amount"
                    maxInputLabel="Maximum amount"
                    showCountButton={false}
                  />
                  <div className="pt-2 flex gap-2">
                    <Button
                      className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStagedAmountMin(undefined);
                        setStagedAmountMax(undefined);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Date Range Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Date Range</DropdownMenuSubTrigger>
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
                  className="w-full border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyAllFilters?.({
                      workers: stagedWorkers,
                      deals: stagedDeals,
                      statuses: stagedStatuses,
                      durationMin: stagedDurationMin,
                      durationMax: stagedDurationMax,
                      amountMin: stagedAmountMin,
                      amountMax: stagedAmountMax,
                    });
                    setFiltersOpen(false);
                  }}
                >
                  {`Show ${previewCount} time logs`}
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8.5!" variant="outline">
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

        {onExportPDF && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPDF}
            className="h-8.5! text-rose-600 hover:text-rose-500"
          >
            <PDFIcon className="size-4" />
            Export PDF
          </Button>
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
      <SelectTrigger className="gap-2 rounded-lg bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-primary/80 font-normal h-8.5!">
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
