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
import { getCurrencySymbol } from "@/features/crm/lib/currency";
import { Label } from "@/components/ui/label";

import { IconStage as StageIcon } from "central-icons/IconStage";
import { IconPound as ValueIcon } from "central-icons/IconPound";
import { IconPercent as ProbabilityIcon } from "central-icons/IconPercent";
import { IconCalendarClock4 as DeadlineIcon } from "central-icons/IconCalendarClock4";
import { IconCalendarEdit as LastUpdatedIcon } from "central-icons/IconCalendarEdit";

export interface DealsToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  stages: Array<{ id: string; name: string }>;
  selectedStages: string[];
  onToggleStage: (value: string) => void;
  onClearFilters: () => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  table: Table<any>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
  // Range filter props (overall min/max from all data)
  valueMin?: number;
  valueMax?: number;
  maxValueCurrency?: string;
  currencies?: string[];
  valueHistogram?: number[];
  onValueCommit?: (min: number, max: number) => void;
  onValueClear?: () => void;
  // Currently applied filter values from URL params
  selectedValueCurrency?: string;
  selectedValueMin?: number;
  selectedValueMax?: number;
  selectedProbabilityMin?: number;
  selectedProbabilityMax?: number;
  // Other filters
  contacts?: string[];
  selectedContacts?: string[];
  onToggleContact?: (contactId: string) => void;
  members?: Array<{ id: string; name: string | null; image: string | null }>;
  selectedMembers?: string[];
  onToggleMember?: (memberId: string) => void;
  deadlineMin?: Date;
  deadlineMax?: Date;
  onDeadlineCommit?: (min: Date, max: Date) => void;
  onDeadlineClear?: () => void;
  probabilityMin?: number;
  probabilityMax?: number;
  onProbabilityCommit?: (min: number, max: number) => void;
  onProbabilityClear?: () => void;
  // Date filters
  deadlineStart?: Date;
  deadlineEnd?: Date;
  onDeadlineChange?: (start?: Date, end?: Date) => void;
  updatedAtStart?: Date;
  updatedAtEnd?: Date;
  onUpdatedAtChange?: (start?: Date, end?: Date) => void;
  // For preview count calculation
  onApplyAllFilters?: (filters: {
    stages: string[];
    contacts: string[];
    members: string[];
    valueCurrency?: string;
    valueMin?: number;
    valueMax?: number;
    probabilityMin?: number;
    probabilityMax?: number;
  }) => void;
}

const sortOptions = [
  { value: "name.asc", label: "Name A → Z" },
  { value: "name.desc", label: "Name Z → A" },
  { value: "value.desc", label: "Highest value" },
  { value: "value.asc", label: "Lowest value" },
  { value: "updatedAt.desc", label: "Recently updated" },
  { value: "updatedAt.asc", label: "Oldest updates" },
];

const PRIMARY_COLUMN_ID = "name";

export function DealsToolbar({
  search,
  onSearchChange,
  stages,
  selectedStages,
  onToggleStage,
  onClearFilters,
  sortValue,
  onSortChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
  valueMin,
  valueMax,
  maxValueCurrency,
  currencies,
  valueHistogram,
  onValueCommit,
  onValueClear,
  selectedValueCurrency,
  selectedValueMin,
  selectedValueMax,
  selectedProbabilityMin,
  selectedProbabilityMax,
  contacts = [],
  selectedContacts = [],
  onToggleContact,
  members = [],
  selectedMembers = [],
  onToggleMember,
  deadlineMin,
  deadlineMax,
  onDeadlineCommit,
  onDeadlineClear,
  probabilityMin,
  probabilityMax,
  onProbabilityCommit,
  onProbabilityClear,
  deadlineStart,
  deadlineEnd,
  onDeadlineChange,
  updatedAtStart,
  updatedAtEnd,
  onUpdatedAtChange,
  onApplyAllFilters,
}: DealsToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const [stagedContacts, setStagedContacts] =
    React.useState<string[]>(selectedContacts);
  const [stagedMembers, setStagedMembers] =
    React.useState<string[]>(selectedMembers);
  const [stagedStages, setStagedStages] =
    React.useState<string[]>(selectedStages);
  const [stagedCurrency, setStagedCurrency] = React.useState<
    string | undefined
  >(selectedValueCurrency);

  const trpc = useTRPC();

  // Fetch ALL deals (unfiltered) for preview calculation
  const { data: allDealsData } = useSuspenseQuery(
    trpc.deals.list.queryOptions({})
  );

  // Fetch date range for filters
  const { data: dateRange } = useSuspenseQuery(
    trpc.deals.dateRange.queryOptions()
  );

  const allDealsUnfiltered = React.useMemo(
    () => allDealsData?.items || [],
    [allDealsData]
  );
  const [stagedValueMin, setStagedValueMin] = React.useState<
    number | undefined
  >(selectedValueMin);
  const [stagedValueMax, setStagedValueMax] = React.useState<
    number | undefined
  >(selectedValueMax);
  const [stagedProbMin, setStagedProbMin] = React.useState<number | undefined>(
    selectedProbabilityMin
  );
  const [stagedProbMax, setStagedProbMax] = React.useState<number | undefined>(
    selectedProbabilityMax
  );
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    setStagedContacts(selectedContacts);
  }, [selectedContacts]);

  React.useEffect(() => {
    setStagedMembers(selectedMembers);
  }, [selectedMembers]);

  React.useEffect(() => {
    setStagedStages(selectedStages);
  }, [selectedStages]);

  React.useEffect(() => {
    setStagedValueMin(selectedValueMin);
    setStagedValueMax(selectedValueMax);
  }, [selectedValueMin, selectedValueMax]);

  React.useEffect(() => {
    setStagedProbMin(selectedProbabilityMin);
    setStagedProbMax(selectedProbabilityMax);
  }, [selectedProbabilityMin, selectedProbabilityMax]);

  React.useEffect(() => {
    setStagedCurrency(selectedValueCurrency);
  }, [selectedValueCurrency]);

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

  const handleToggleMember = (value: string) => {
    setStagedMembers((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  // Stages are already unique objects with id and name

  // Use min/max values passed from props
  const minDealValue = valueMin ?? 0;
  const maxDealValue = valueMax ?? 100000;

  // Calculate the currency symbol for the minimum value based on deals at or near that value
  const minRangeCurrency = React.useMemo(() => {
    const minValue = stagedValueMin ?? minDealValue;

    // Find deals at or near the minimum value (within 10% range)
    const threshold = Math.max(minValue * 1.1, minValue + 1000);
    const dealsNearMin = allDealsUnfiltered.filter((deal) => {
      const dealValue = deal.value ? Number(deal.value) : 0;
      return dealValue >= minValue && dealValue <= threshold;
    });

    if (dealsNearMin.length === 0) {
      // Fallback: find the first deal at or above the minimum
      const dealsAboveMin = allDealsUnfiltered
        .filter((deal) => {
          const dealValue = deal.value ? Number(deal.value) : 0;
          return dealValue >= minValue;
        })
        .sort((a, b) => {
          const aVal = a.value ? Number(a.value) : 0;
          const bVal = b.value ? Number(b.value) : 0;
          return aVal - bVal;
        });

      if (dealsAboveMin.length > 0) {
        return dealsAboveMin[0]!.currency || "USD";
      }
      return maxValueCurrency; // Ultimate fallback
    }

    // Find the currency with the highest value deal near the min
    let maxValueNearMin = 0;
    let currencyOfMax = maxValueCurrency;

    for (const deal of dealsNearMin) {
      const dealValue = deal.value ? Number(deal.value) : 0;
      if (dealValue > maxValueNearMin) {
        maxValueNearMin = dealValue;
        currencyOfMax = deal.currency || "USD";
      }
    }

    return currencyOfMax;
  }, [allDealsUnfiltered, stagedValueMin, minDealValue, maxValueCurrency]);

  // Calculate the currency symbol for the maximum value based on deals at or near that value
  const maxRangeCurrency = React.useMemo(() => {
    const maxValue = stagedValueMax ?? maxDealValue;

    // Find deals at or near the maximum value (within 10% range below it)
    const threshold = Math.max(maxValue * 0.9, maxValue - 1000);
    const dealsNearMax = allDealsUnfiltered.filter((deal) => {
      const dealValue = deal.value ? Number(deal.value) : 0;
      return dealValue >= threshold && dealValue <= maxValue;
    });

    if (dealsNearMax.length === 0) {
      // Fallback: find the last deal at or below the maximum
      const dealsBelowMax = allDealsUnfiltered
        .filter((deal) => {
          const dealValue = deal.value ? Number(deal.value) : 0;
          return dealValue <= maxValue;
        })
        .sort((a, b) => {
          const aVal = a.value ? Number(a.value) : 0;
          const bVal = b.value ? Number(b.value) : 0;
          return bVal - aVal;
        });

      if (dealsBelowMax.length > 0) {
        return dealsBelowMax[0]!.currency || "USD";
      }
      return maxValueCurrency; // Ultimate fallback
    }

    // Find the currency with the highest value deal near the max
    let maxValueNearMax = 0;
    let currencyOfMax = maxValueCurrency;

    for (const deal of dealsNearMax) {
      const dealValue = deal.value ? Number(deal.value) : 0;
      if (dealValue > maxValueNearMax) {
        maxValueNearMax = dealValue;
        currencyOfMax = deal.currency || "USD";
      }
    }

    return currencyOfMax;
  }, [allDealsUnfiltered, stagedValueMax, maxDealValue, maxValueCurrency]);

  // Calculate preview count considering ALL staged filters combined
  const previewCount = React.useMemo(() => {
    const filtered = allDealsUnfiltered.filter((deal) => {
      // Check stages filter (if any selected)
      if (stagedStages.length > 0) {
        const dealStageId = deal.pipelineStage?.id;
        if (!dealStageId || !stagedStages.includes(dealStageId)) {
          return false;
        }
      }

      // Check currency filter
      if (stagedCurrency) {
        if (deal.currency !== stagedCurrency) {
          return false;
        }
      }

      // Check value filter (using raw value in deal's currency)
      if (
        typeof stagedValueMin === "number" ||
        typeof stagedValueMax === "number"
      ) {
        const dealValue = deal.value ? Number(deal.value) : 0;
        if (typeof stagedValueMin === "number" && dealValue < stagedValueMin)
          return false;
        if (typeof stagedValueMax === "number" && dealValue > stagedValueMax)
          return false;
      }

      // Check contacts filter (if any selected)
      if (stagedContacts.length > 0) {
        const dealContactIds = (deal.contacts || []).map((c: any) => c.id);
        const hasMatchingContact = stagedContacts.some((contactId: string) =>
          dealContactIds.includes(contactId)
        );
        if (!hasMatchingContact) {
          return false;
        }
      }

      // Check members filter (if any selected)
      if (stagedMembers.length > 0) {
        const dealMemberIds = (deal.members || []).map((m: any) => m.id);
        const hasMatchingMember = stagedMembers.some((memberId: string) =>
          dealMemberIds.includes(memberId)
        );
        if (!hasMatchingMember) {
          return false;
        }
      }

      // Check probability filter
      if (
        typeof stagedProbMin === "number" ||
        typeof stagedProbMax === "number"
      ) {
        const dealProb = deal.pipelineStage?.probability ?? 0;
        if (typeof stagedProbMin === "number" && dealProb < stagedProbMin)
          return false;
        if (typeof stagedProbMax === "number" && dealProb > stagedProbMax)
          return false;
      }

      return true;
    });

    return filtered.length;
  }, [
    allDealsUnfiltered,
    stagedStages,
    stagedCurrency,
    stagedValueMin,
    stagedValueMax,
    stagedContacts,
    stagedMembers,
    stagedProbMin,
    stagedProbMax,
  ]);

  const hasFiltersApplied =
    selectedStages.length > 0 ||
    selectedValueCurrency ||
    typeof selectedValueMin === "number" ||
    typeof selectedValueMax === "number" ||
    selectedContacts.length > 0 ||
    selectedMembers.length > 0 ||
    typeof selectedProbabilityMin === "number" ||
    typeof selectedProbabilityMax === "number";

  const formatNumBadge = (
    label: string,
    minVal?: number,
    maxVal?: number,
    hist?: number[],
    prefix?: string
  ) => {
    if (typeof minVal !== "number" || typeof maxVal !== "number") return "";
    const hasHist = Array.isArray(hist) && hist.length > 0;
    const minB = hasHist ? Math.min(...hist) : minVal;
    const maxB = hasHist ? Math.max(...hist) : maxVal;
    const slack = Math.max(1, Math.round((maxB - minB) * 0.01));
    const atLower = minVal <= minB + slack;
    const atUpper = maxVal >= maxB - slack;
    const formatNum = (n: number) => {
      const abs = Math.abs(n).toLocaleString();
      const sign = n < 0 ? "-" : "";
      return `${sign}${prefix || ""}${abs}`;
    };
    if (atLower && atUpper) return `${label}: All`;
    if (atLower && !atUpper) return `${label}: ≤ ${formatNum(maxVal)}`;
    if (!atLower && atUpper) return `${label}: ≥ ${formatNum(minVal)}`;
    return `${label}: ${formatNum(minVal)} - ${formatNum(maxVal)}`;
  };

  return (
    <div className="flex justify-between w-full items-center">
      <div className="flex items-center gap-2 w-full">
        {/* Search with filters inside */}
        <div className="flex w-128 items-center bg-background transition duration-250 relative hover:bg-primary-foreground/50 hover:text-black rounded-lg h-8.5">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />

          <Input
            placeholder="Search for deals..."
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

              {/* Stage Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <StageIcon className="size-4" />
                  Stage
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                  alignOffset={-5}
                >
                  <div className="max-h-64 overflow-auto pr-1">
                    {stages.length === 0 ? (
                      <div className="px-4 py-2.5 text-xs text-primary/75">
                        No stages available
                      </div>
                    ) : (
                      stages.map((stage) => (
                        <div
                          key={stage.id}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedStages.includes(stage.id)}
                            onCheckedChange={() => handleToggleStage(stage.id)}
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">{stage.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button
                      className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
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

              {/* Value Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ValueIcon className="size-4" />
                  Value
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  {(() => {
                    const spikes = Array.from(
                      { length: 24 },
                      (_, i) => (i + 1) / 25
                    );
                    // Use calculated min/max from actual deals, or histogram if available
                    const minH =
                      valueHistogram && valueHistogram.length > 0
                        ? Math.min(...valueHistogram)
                        : minDealValue;
                    const maxH =
                      valueHistogram && valueHistogram.length > 0
                        ? Math.max(...valueHistogram)
                        : maxDealValue;
                    return (
                      <>
                        {/* Currency selector */}
                        {currencies && currencies.length > 1 && (
                          <div className="pb-3 px-1">
                            <Label className="text-xs text-primary/80 dark:text-white/60 mb-1.5 block">
                              Currency
                            </Label>
                            <Select
                              value={stagedCurrency || "all"}
                              onValueChange={(value) => {
                                setStagedCurrency(
                                  value === "all" ? undefined : value
                                );
                              }}
                            >
                              <SelectTrigger className="text-xs h-8 border-black/10 dark:border-white/5 bg-background">
                                <SelectValue placeholder="All currencies" />
                              </SelectTrigger>
                              <SelectContent className="border-black/10 dark:border-white/5 bg-background">
                                <SelectItem value="all" className="text-xs">
                                  All currencies
                                </SelectItem>
                                {currencies.map((currency) => (
                                  <SelectItem
                                    key={currency}
                                    value={currency}
                                    className="text-xs"
                                  >
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <RangeSlider
                          label=""
                          mode="number"
                          min={minH}
                          max={maxH}
                          minPrefix={getCurrencySymbol(minRangeCurrency)}
                          maxPrefix={getCurrencySymbol(maxRangeCurrency)}
                          value={[
                            stagedValueMin ?? minH,
                            stagedValueMax ?? maxH,
                          ]}
                          onChange={([min, max]) => {
                            // Only set values if they differ from defaults
                            setStagedValueMin(min === minH ? undefined : min);
                            setStagedValueMax(max === maxH ? undefined : max);
                          }}
                          histogramData={valueHistogram || []}
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
                            className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStagedCurrency(undefined);
                              setStagedValueMin(undefined);
                              setStagedValueMax(undefined);
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

              {/* Contacts Filter */}
              {contacts.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs px-4 py-3 hover:brightness-120 rounded-lg">
                    Contacts
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="rounded-lg bg-[#202e32] border border-white/0 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {contacts.map((contact) => {
                        const selected = stagedContacts.includes(contact);
                        return (
                          <div
                            key={contact}
                            className="flex items-center gap-2 py-2 text-xs cursor-pointer rounded-lg group"
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() =>
                                handleToggleContact(contact)
                              }
                              className="rounded-lg border-white/5 cursor-pointer group-hover:bg-[#202e32] data-[state=checked]:bg-[#202e32] data-[state=checked]:border-white/5"
                            />
                            <span className="select-none">{contact}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-3 flex gap-2">
                      <Button
                        className="flex-1 border border-white/5 bg-[#202e32] hover:bg-[#202e32] hover:brightness-120 rounded-lg text-xs text-white py-3"
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

              {/* Members Filter */}
              {members.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs px-4 py-3 hover:brightness-120 rounded-lg">
                    Members assigned
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="rounded-lg bg-[#202e32] border border-white/0 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {members.map((member) => {
                        const selected = stagedMembers.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 py-2 text-xs cursor-pointer rounded-lg group"
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() =>
                                handleToggleMember(member.id)
                              }
                              className="rounded-lg border-white/5 cursor-pointer group-hover:bg-[#202e32] data-[state=checked]:brightness-120 data-[state=checked]:border-white/5"
                            />
                            <span className="select-none">
                              {member.name || "Unknown"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-3 flex gap-2">
                      <Button
                        className="flex-1 border border-white/5 bg-[#202e32] hover:bg-[#202e32] hover:brightness-120 rounded-lg text-xs text-white py-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedMembers([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Probability Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ProbabilityIcon className="size-4" />
                  Probability
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
                          value={[stagedProbMin ?? 0, stagedProbMax ?? 100]}
                          onChange={([min, max]) => {
                            // Only set values if they differ from defaults
                            setStagedProbMin(min === 0 ? undefined : min);
                            setStagedProbMax(max === 100 ? undefined : max);
                          }}
                          bins={100}
                          spikePositions={spikes}
                          baseBarPct={6}
                          spikeBarPct={72}
                          minInputLabel="Minimum probability"
                          maxInputLabel="Maximum probability"
                          showCountButton={false}
                        />
                        <div className="pt-2 flex gap-2">
                          <Button
                            className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStagedProbMin(undefined);
                              setStagedProbMax(undefined);
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

              {/* Deadline Date Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <DeadlineIcon className="size-4" />
                  Deadline
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent alignOffset={-5}>
                  <DateRangeFilter
                    minDate={dateRange?.minDate || new Date(2020, 0, 1)}
                    maxDate={dateRange?.maxDate || new Date()}
                    valueStart={deadlineStart}
                    valueEnd={deadlineEnd}
                    onChange={(start, end) => onDeadlineChange?.(start, end)}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Updated At Date Filter */}
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
                      members: stagedMembers,
                      valueCurrency: stagedCurrency,
                      valueMin: stagedValueMin,
                      valueMax: stagedValueMax,
                      probabilityMin: stagedProbMin,
                      probabilityMax: stagedProbMax,
                    });
                    setFiltersOpen(false);
                  }}
                >
                  {`Show ${previewCount} deals`}
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
        className="gap-2 rounded-lg bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-primary/80 dark:text-white font-normal h-8.5! "
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
