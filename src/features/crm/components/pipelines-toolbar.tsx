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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
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
import DateRangeFilter from "@/components/ui/date-range-filter";

import { IconLiveFull as StatusIcon } from "central-icons/IconLiveFull";
import { IconStage as StageIcon } from "central-icons/IconStage";
import { IconContacts as ContactIcon } from "central-icons/IconContacts";
import { IconPound as ValueIcon } from "central-icons/IconPound";
import { IconPercent as WinPercentIcon } from "central-icons/IconPercent";
import { IconHashtag as DealsIcon } from "central-icons/IconHashtag";
import { IconCalenderAdd as CreatedAtIcon } from "central-icons/IconCalenderAdd";
import { IconCalendarEdit as LastUpdatedIcon } from "central-icons/IconCalendarEdit";

export interface PipelinesToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  isActive: boolean | null;
  onActiveFilterChange: (isActive: boolean | null) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  table: Table<any>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
  // Filter options and selections
  stages?: string[];
  selectedStages?: string[];
  contacts?: Array<{ id: string; name: string }>;
  selectedContacts?: string[];
  // Range filter props (overall min/max from all data)
  dealsCountMin?: number;
  dealsCountMax?: number;
  dealsValueMin?: number;
  dealsValueMax?: number;
  winRateMin?: number;
  winRateMax?: number;
  // Currently applied filter values from URL params
  selectedDealsCountMin?: number;
  selectedDealsCountMax?: number;
  selectedDealsValueMin?: number;
  selectedDealsValueMax?: number;
  selectedWinRateMin?: number;
  selectedWinRateMax?: number;
  // Currency options and selection
  currencies?: string[];
  selectedCurrency?: string;
  onCurrencyChange?: (currency: string) => void;
  // Date filter props
  createdAtStart?: Date;
  createdAtEnd?: Date;
  onCreatedAtChange?: (start?: Date, end?: Date) => void;
  updatedAtStart?: Date;
  updatedAtEnd?: Date;
  onUpdatedAtChange?: (start?: Date, end?: Date) => void;
  onApplyAllFilters?: (filters: {
    stages: string[];
    contacts: string[];
    dealsCountMin?: number;
    dealsCountMax?: number;
    dealsValueMin?: number;
    dealsValueMax?: number;
    winRateMin?: number;
    winRateMax?: number;
  }) => void;
}

const sortOptions = [
  { value: "name.asc", label: "Name A → Z" },
  { value: "name.desc", label: "Name Z → A" },
  { value: "createdAt.desc", label: "Newest first" },
  { value: "createdAt.asc", label: "Oldest first" },
  { value: "updatedAt.desc", label: "Recently updated" },
  { value: "updatedAt.asc", label: "Oldest updates" },
];

const PRIMARY_COLUMN_ID = "name";

export function PipelinesToolbar({
  search,
  onSearchChange,
  isActive,
  onActiveFilterChange,
  sortValue,
  onSortChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
  stages = [],
  selectedStages = [],
  contacts = [],
  selectedContacts = [],
  dealsCountMin,
  dealsCountMax,
  dealsValueMin,
  dealsValueMax,
  winRateMin,
  winRateMax,
  selectedDealsCountMin,
  selectedDealsCountMax,
  selectedDealsValueMin,
  selectedDealsValueMax,
  selectedWinRateMin,
  selectedWinRateMax,
  currencies = [],
  selectedCurrency,
  onCurrencyChange,
  createdAtStart,
  createdAtEnd,
  onCreatedAtChange,
  updatedAtStart,
  updatedAtEnd,
  onUpdatedAtChange,
  onApplyAllFilters,
}: PipelinesToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const [stagedStages, setStagedStages] =
    React.useState<string[]>(selectedStages);
  const [stagedContacts, setStagedContacts] =
    React.useState<string[]>(selectedContacts);

  const trpc = useTRPC();

  // Fetch date range for filters
  const { data: dateRange } = useSuspenseQuery(
    trpc.pipelines.dateRange.queryOptions()
  );

  // Fetch ALL pipelines (unfiltered) for preview calculation
  const { data: allPipelinesData } = useSuspenseQuery(
    trpc.pipelines.list.queryOptions({})
  );

  const allPipelinesUnfiltered = React.useMemo(
    () => allPipelinesData?.items || [],
    [allPipelinesData]
  );
  const [stagedDealsCountMin, setStagedDealsCountMin] = React.useState<
    number | undefined
  >(selectedDealsCountMin);
  const [stagedDealsCountMax, setStagedDealsCountMax] = React.useState<
    number | undefined
  >(selectedDealsCountMax);
  const [stagedDealsValueMin, setStagedDealsValueMin] = React.useState<
    number | undefined
  >(selectedDealsValueMin);
  const [stagedDealsValueMax, setStagedDealsValueMax] = React.useState<
    number | undefined
  >(selectedDealsValueMax);
  const [stagedWinRateMin, setStagedWinRateMin] = React.useState<
    number | undefined
  >(selectedWinRateMin);
  const [stagedWinRateMax, setStagedWinRateMax] = React.useState<
    number | undefined
  >(selectedWinRateMax);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    setStagedStages(selectedStages);
  }, [selectedStages]);

  React.useEffect(() => {
    setStagedContacts(selectedContacts);
  }, [selectedContacts]);

  React.useEffect(() => {
    setStagedDealsCountMin(selectedDealsCountMin);
    setStagedDealsCountMax(selectedDealsCountMax);
  }, [selectedDealsCountMin, selectedDealsCountMax]);

  React.useEffect(() => {
    setStagedDealsValueMin(selectedDealsValueMin);
    setStagedDealsValueMax(selectedDealsValueMax);
  }, [selectedDealsValueMin, selectedDealsValueMax]);

  React.useEffect(() => {
    setStagedWinRateMin(selectedWinRateMin);
    setStagedWinRateMax(selectedWinRateMax);
  }, [selectedWinRateMin, selectedWinRateMax]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleToggleStage = (value: string) => {
    setStagedStages((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleToggleContact = (value: string) => {
    setStagedContacts((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const uniqueStages = React.useMemo(
    () => [...new Set(stages.filter(Boolean))],
    [stages]
  );

  // Use min/max values passed from props (calculated server-side with USD conversion)
  const minDealsCount = dealsCountMin ?? 0;
  const maxDealsCount = dealsCountMax ?? 100;
  const minDealsValue = dealsValueMin ?? 0;
  const maxDealsValue = dealsValueMax ?? 100000;

  // Calculate preview count considering ALL staged filters combined
  const previewCount = React.useMemo(() => {
    const filtered = allPipelinesUnfiltered.filter((pipeline) => {
      // Check stages filter
      if (stagedStages.length > 0) {
        const pipelineStages = pipeline.stages?.map((s: any) => s.name) || [];
        const hasMatchingStage = stagedStages.some((stage: string) =>
          pipelineStages.includes(stage)
        );
        if (!hasMatchingStage) return false;
      }

      // Check contacts filter
      if (stagedContacts.length > 0) {
        const pipelineContactIds = (pipeline.contacts || []).map(
          (c: any) => c.id
        );
        const hasMatchingContact = stagedContacts.some((contactId: string) =>
          pipelineContactIds.includes(contactId)
        );
        if (!hasMatchingContact) return false;
      }

      // Check deals count filter
      if (
        typeof stagedDealsCountMin === "number" ||
        typeof stagedDealsCountMax === "number"
      ) {
        const count = pipeline.dealsCount || 0;
        if (
          typeof stagedDealsCountMin === "number" &&
          count < stagedDealsCountMin
        )
          return false;
        if (
          typeof stagedDealsCountMax === "number" &&
          count > stagedDealsCountMax
        )
          return false;
      }

      // Check deals value filter
      if (
        typeof stagedDealsValueMin === "number" ||
        typeof stagedDealsValueMax === "number"
      ) {
        const value = Number(pipeline.dealsValue || 0);
        if (
          typeof stagedDealsValueMin === "number" &&
          value < stagedDealsValueMin
        )
          return false;
        if (
          typeof stagedDealsValueMax === "number" &&
          value > stagedDealsValueMax
        )
          return false;
      }

      // Check win rate filter
      if (
        typeof stagedWinRateMin === "number" ||
        typeof stagedWinRateMax === "number"
      ) {
        const winRate = pipeline.winRate || 0;
        if (typeof stagedWinRateMin === "number" && winRate < stagedWinRateMin)
          return false;
        if (typeof stagedWinRateMax === "number" && winRate > stagedWinRateMax)
          return false;
      }

      return true;
    });

    return filtered.length;
  }, [
    allPipelinesUnfiltered,
    stagedStages,
    stagedContacts,
    stagedDealsCountMin,
    stagedDealsCountMax,
    stagedDealsValueMin,
    stagedDealsValueMax,
    stagedWinRateMin,
    stagedWinRateMax,
  ]);

  const hasFiltersApplied =
    isActive !== null ||
    selectedStages.length > 0 ||
    selectedContacts.length > 0 ||
    typeof selectedDealsCountMin === "number" ||
    typeof selectedDealsCountMax === "number" ||
    typeof selectedDealsValueMin === "number" ||
    typeof selectedDealsValueMax === "number" ||
    typeof selectedWinRateMin === "number" ||
    typeof selectedWinRateMax === "number";

  return (
    <div className="flex justify-between w-full items-center">
      <div className="flex items-center gap-2 w-full">
        {/* Search with filters inside */}
        <div className="flex w-128 items-center bg-background transition duration-250 relative hover:bg-primary-foreground/50 hover:text-black rounded-lg h-8.5">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />

          <Input
            placeholder="Search pipelines by name..."
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
              className="rounded-sm border border-black/10 dark:border-white/5 w-[300px] p-1 mt-2 -mr-[9px]"
            >
              <DropdownMenuSub>
                <h1 className="text-xs text-primary/80 dark:text-white/60 px-4 py-2.5">
                  Filters
                </h1>
              </DropdownMenuSub>

              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />

              {/* Active/Inactive Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <StatusIcon className="size-4" />
                  Status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  <div className="max-h-64 overflow-auto pr-1">
                    <div
                      className="flex items-center gap-2 py-2 text-xs cursor-pointer rounded-sm group"
                      onClick={() => onActiveFilterChange(null)}
                    >
                      <Checkbox
                        checked={isActive === null}
                        className="rounded-sm border-black/10 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground/50 data-[state=checked]:bg-primary-foreground/50 hover:text-black data-[state=checked]:brightness-120 data-[state=checked]:border-black/10 dark:data-[state=checked]:border-white/5"
                      />
                      <span className="select-none">All pipelines</span>
                    </div>

                    <div
                      className="flex items-center gap-2 py-2 text-xs cursor-pointer rounded-sm group"
                      onClick={() => onActiveFilterChange(true)}
                    >
                      <Checkbox
                        checked={isActive === true}
                        className="rounded-sm border-black/10 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground/50 data-[state=checked]:bg-primary-foreground/50 hover:text-black data-[state=checked]:brightness-120 data-[state=checked]:border-black/10 dark:data-[state=checked]:border-white/5"
                      />
                      <span className="select-none">Active only</span>
                    </div>
                    <div
                      className="flex items-center gap-2 py-2 text-xs cursor-pointer rounded-sm group"
                      onClick={() => onActiveFilterChange(false)}
                    >
                      <Checkbox
                        checked={isActive === false}
                        className="rounded-sm border-black/10 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground/50 data-[state=checked]:bg-primary-foreground/50 hover:text-black data-[state=checked]:brightness-120 data-[state=checked]:border-black/10 dark:data-[state=checked]:border-white/5"
                      />
                      <span className="select-none">Inactive only</span>
                    </div>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button
                      className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onActiveFilterChange(null);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Stages Filter */}
              {uniqueStages.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <StageIcon className="size-4" />
                    Stages
                  </DropdownMenuSubTrigger>

                  <DropdownMenuSubContent
                    className="rounded-sm bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {uniqueStages.map((stage) => (
                        <div
                          key={stage}
                          className="flex items-center gap-2 py-2 text-xs cursor-pointer rounded-sm group"
                        >
                          <Checkbox
                            checked={stagedStages.includes(stage)}
                            onCheckedChange={() => handleToggleStage(stage)}
                            className="rounded-sm border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground hover:brightness-120 data-[state=checked]:brightness-120 data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">{stage}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedStages([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Contacts Filter */}
              {contacts.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ContactIcon className="size-4" />
                    Contacts
                  </DropdownMenuSubTrigger>

                  <DropdownMenuSubContent alignOffset={-5}>
                    <div className="max-h-64 overflow-auto pr-1">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center gap-2 py-2 text-xs cursor-pointer rounded-sm group"
                        >
                          <Checkbox
                            checked={stagedContacts.includes(contact.id)}
                            onCheckedChange={() =>
                              handleToggleContact(contact.id)
                            }
                            className="rounded-sm border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground hover:brightness-120 data-[state=checked]:brightness-120 data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">{contact.name}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedContacts([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Number of Deals Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <DealsIcon className="size-4" />
                  Number of Deals
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  {(() => {
                    const spikes = Array.from(
                      { length: 24 },
                      (_, i) => (i + 1) / 25
                    );
                    return (
                      <>
                        <RangeSlider
                          label=""
                          mode="number"
                          min={minDealsCount}
                          max={maxDealsCount}
                          value={[
                            stagedDealsCountMin ?? minDealsCount,
                            stagedDealsCountMax ?? maxDealsCount,
                          ]}
                          onChange={([min, max]) => {
                            // Only set values if they differ from defaults
                            setStagedDealsCountMin(
                              min === minDealsCount ? undefined : min
                            );
                            setStagedDealsCountMax(
                              max === maxDealsCount ? undefined : max
                            );
                          }}
                          bins={180}
                          spikePositions={spikes}
                          baseBarPct={6}
                          spikeBarPct={72}
                          minInputLabel="Minimum deals"
                          maxInputLabel="Maximum deals"
                          showCountButton={false}
                        />
                        <div className="pt-2 flex gap-2">
                          <Button
                            className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStagedDealsCountMin(undefined);
                              setStagedDealsCountMax(undefined);
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Deals Value Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ValueIcon className="size-4" />
                  Deals Value
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  {(() => {
                    const spikes = Array.from(
                      { length: 24 },
                      (_, i) => (i + 1) / 25
                    );
                    return (
                      <>
                        <RangeSlider
                          label=""
                          mode="number"
                          min={minDealsValue}
                          max={maxDealsValue}
                          prefix="$"
                          value={[
                            stagedDealsValueMin ?? minDealsValue,
                            stagedDealsValueMax ?? maxDealsValue,
                          ]}
                          onChange={([min, max]) => {
                            // Only set values if they differ from defaults
                            setStagedDealsValueMin(
                              min === minDealsValue ? undefined : min
                            );
                            setStagedDealsValueMax(
                              max === maxDealsValue ? undefined : max
                            );
                          }}
                          bins={180}
                          spikePositions={spikes}
                          baseBarPct={6}
                          spikeBarPct={72}
                          minInputLabel="Minimum value"
                          maxInputLabel="Maximum value"
                          showCountButton={false}
                        />
                        <div className="pt-2 flex gap-2">
                          <Button
                            className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStagedDealsValueMin(undefined);
                              setStagedDealsValueMax(undefined);
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Win Rate Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <WinPercentIcon className="size-4" />
                  Win Rate
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  {(() => {
                    const spikes = Array.from(
                      { length: 24 },
                      (_, i) => (i + 1) / 25
                    );
                    return (
                      <>
                        <RangeSlider
                          label=""
                          mode="number"
                          min={0}
                          max={100}
                          suffix="%"
                          value={[
                            stagedWinRateMin ?? 0,
                            stagedWinRateMax ?? 100,
                          ]}
                          onChange={([min, max]) => {
                            // Only set values if they differ from defaults
                            setStagedWinRateMin(min === 0 ? undefined : min);
                            setStagedWinRateMax(max === 100 ? undefined : max);
                          }}
                          bins={100}
                          spikePositions={spikes}
                          baseBarPct={6}
                          spikeBarPct={72}
                          minInputLabel="Minimum win rate"
                          maxInputLabel="Maximum win rate"
                          showCountButton={false}
                        />
                        <div className="pt-2 flex gap-2">
                          <Button
                            className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStagedWinRateMin(undefined);
                              setStagedWinRateMax(undefined);
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Created Date Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CreatedAtIcon className="size-4" />
                  Created Date
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  <DateRangeFilter
                    minDate={dateRange?.minDate || new Date(2020, 0, 1)}
                    maxDate={dateRange?.maxDate || new Date()}
                    valueStart={createdAtStart}
                    valueEnd={createdAtEnd}
                    onChange={(start, end) => onCreatedAtChange?.(start, end)}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Last Updated Date Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <LastUpdatedIcon className="size-4" />
                  Last Updated
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  <DateRangeFilter
                    minDate={dateRange?.minDate || new Date(2020, 0, 1)}
                    maxDate={dateRange?.maxDate || new Date()}
                    valueStart={updatedAtStart}
                    valueEnd={updatedAtEnd}
                    onChange={(start, end) => onUpdatedAtChange?.(start, end)}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <div className="pt-1">
                <Button
                  variant="filter"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyAllFilters?.({
                      stages: stagedStages,
                      contacts: stagedContacts,
                      dealsCountMin: stagedDealsCountMin,
                      dealsCountMax: stagedDealsCountMax,
                      dealsValueMin: stagedDealsValueMin,
                      dealsValueMax: stagedDealsValueMax,
                      winRateMin: stagedWinRateMin,
                      winRateMax: stagedWinRateMax,
                    });
                    setFiltersOpen(false);
                  }}
                >
                  {`Show ${previewCount} pipelines`}
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
              <ChevronDown className="size-3 text-primary/60 dark:text-white/60 mt-0.5" />
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
                className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black rounded-sm cursor-pointer"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Currency selector */}
        {currencies.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-primary/80 dark:text-white rounded-sm font-normal h-9">
                {selectedCurrency || currencies[0]}
                <ChevronDown className="size-3.5 text-primary/80 dark:text-white/60 ml-1" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              className="rounded-sm bg-background border border-black/10 dark:border-white/5 w-[180px] p-1"
            >
              {currencies.map((currency) => (
                <DropdownMenuCheckboxItem
                  key={currency}
                  checked={selectedCurrency === currency}
                  onSelect={() => {
                    onCurrencyChange?.(currency);
                  }}
                  className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black rounded-sm cursor-pointer"
                >
                  {currency}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
        className="h-max gap-2 rounded-lg bg-background px-3 py-3 text-xs text-primary/80 dark:text-white hover:bg-primary-foreground/50 hover:text-black "
        chevron={false}
      >
        <EyeIcon className="size-3 dark:text-white/60" />
        <span className="flex items-center gap-2">Columns</span>
      </SelectTrigger>

      <SelectContent className="w-64 border-black/10 dark:border-white/5 bg-background p-0 shadow-2xl backdrop-blur rounded-lg">
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
            className="w-full justify-center px-4! py-2 text-left text-xs text-primary/80 font-normal dark:text-white transition bg-background hover:bg-primary/15 hover:text-black dark:hover:text-white rounded-sm border-black/15 dark:border-white/5 "
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
          "flex flex-1 items-center gap-2 rounded-sm px-2 py-2 text-left text-xs transition hover:bg-primary/5 hover:text-black dark:hover:text-white group",
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
            "size-3.5 shrink-0 text-primary/80 dark:text-white transition group-hover:text-black dark:group-hover:text-white",
            checked ? "opacity-100" : "opacity-0"
          )}
        />
        <span className="flex-1 truncate text-primary/80 group-hover:text-black dark:text-white group-hover:dark:text-white">
          {label}
        </span>
      </button>
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab rounded-sm p-2 text-primary/80 dark:text-white/40 transition hover:text-black dark:hover:text-white"
      >
        <GripVerticalIcon className="size-3.5" />
      </span>
    </div>
  );
}

function FixedColumnRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-sm px-2 py-2 text-xs text-primary/80 dark:text-white/80">
      <CheckIcon className="size-3.5 shrink-0 text-primary/80 dark:text-white" />
      <span className="flex-1 truncate text-primary/80 dark:text-white">
        {label}
      </span>
      <span className="rounded-sm bg-primary/80 dark:bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary/80 dark:text-white/60">
        Locked
      </span>
    </div>
  );
}
