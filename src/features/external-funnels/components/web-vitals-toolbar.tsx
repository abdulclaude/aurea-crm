"use client";

import { IconSettingsSliderThree as FilterIcon } from "central-icons/IconSettingsSliderThree";
import { ChevronDown, SearchIcon } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import DateRangeFilter from "@/components/ui/date-range-filter";
import { Gauge, Activity, Smartphone } from "lucide-react";

import { IconCalendarEdit as TimestampIcon } from "central-icons/IconCalendarEdit";

export interface WebVitalsToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  // Metric filter
  metrics?: string[];
  selectedMetrics?: string[];
  onToggleMetric?: (metric: string) => void;
  // Rating filter
  ratings?: string[];
  selectedRatings?: string[];
  onToggleRating?: (rating: string) => void;
  // Device type filter
  deviceTypes?: string[];
  selectedDeviceTypes?: string[];
  onToggleDeviceType?: (deviceType: string) => void;
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
  { value: "value.desc", label: "Highest value" },
  { value: "value.asc", label: "Lowest value" },
  { value: "metric.asc", label: "Metric A → Z" },
  { value: "metric.desc", label: "Metric Z → A" },
];

const METRIC_LABELS: Record<string, string> = {
  LCP: "Largest Contentful Paint",
  INP: "Interaction to Next Paint",
  CLS: "Cumulative Layout Shift",
  FCP: "First Contentful Paint",
  TTFB: "Time to First Byte",
  FID: "First Input Delay",
};

const RATING_LABELS: Record<string, string> = {
  GOOD: "Good",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  POOR: "Poor",
};

export function WebVitalsToolbar({
  search,
  onSearchChange,
  metrics = [],
  selectedMetrics = [],
  onToggleMetric,
  ratings = [],
  selectedRatings = [],
  onToggleRating,
  deviceTypes = [],
  selectedDeviceTypes = [],
  onToggleDeviceType,
  timestampStart,
  timestampEnd,
  onTimestampChange,
  sortValue = "timestamp.desc",
  onSortChange,
  onClearFilters,
}: WebVitalsToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Staged filters for preview
  const [stagedMetrics, setStagedMetrics] = React.useState<string[]>(selectedMetrics);
  const [stagedRatings, setStagedRatings] = React.useState<string[]>(selectedRatings);
  const [stagedDeviceTypes, setStagedDeviceTypes] = React.useState<string[]>(selectedDeviceTypes);

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    setStagedMetrics(selectedMetrics);
  }, [selectedMetrics]);

  React.useEffect(() => {
    setStagedRatings(selectedRatings);
  }, [selectedRatings]);

  React.useEffect(() => {
    setStagedDeviceTypes(selectedDeviceTypes);
  }, [selectedDeviceTypes]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleToggleMetric = (value: string) => {
    setStagedMetrics((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleToggleRating = (value: string) => {
    setStagedRatings((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleToggleDeviceType = (value: string) => {
    setStagedDeviceTypes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const hasFiltersApplied =
    selectedMetrics.length > 0 ||
    selectedRatings.length > 0 ||
    selectedDeviceTypes.length > 0 ||
    timestampStart ||
    timestampEnd;

  return (
    <div className="flex justify-between w-full items-center">
      <div className="flex items-center gap-2 w-full">
        {/* Search with filters inside */}
        <div className="flex w-128 items-center bg-background transition duration-250 relative hover:bg-primary-foreground/50 hover:text-black rounded-lg h-8.5">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />

          <Input
            placeholder="Search by page URL..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="text-xs px-0 border-none bg-transparent! hover:bg-transparent w-128 pl-8"
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

              {/* Metric Filter */}
              {metrics.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Gauge className="size-4" />
                    Metric
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {metrics.map((metric) => (
                        <div
                          key={metric}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedMetrics.includes(metric)}
                            onCheckedChange={() => handleToggleMetric(metric)}
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">
                            {METRIC_LABELS[metric] || metric}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedMetrics([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Rating Filter */}
              {ratings.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Activity className="size-4" />
                    Rating
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {ratings.map((rating) => (
                        <div
                          key={rating}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedRatings.includes(rating)}
                            onCheckedChange={() => handleToggleRating(rating)}
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">
                            {RATING_LABELS[rating] || rating}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedRatings([]);
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
                    <Smartphone className="size-4" />
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
                            onCheckedChange={() => handleToggleDeviceType(deviceType)}
                            className="rounded-lg border-black/10 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none capitalize">{deviceType}</span>
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
                    setStagedMetrics([]);
                    setStagedRatings([]);
                    setStagedDeviceTypes([]);
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
                    if (onToggleMetric) {
                      const toAdd = stagedMetrics.filter(m => !selectedMetrics.includes(m));
                      const toRemove = selectedMetrics.filter(m => !stagedMetrics.includes(m));
                      toAdd.forEach(onToggleMetric);
                      toRemove.forEach(onToggleMetric);
                    }
                    if (onToggleRating) {
                      const toAdd = stagedRatings.filter(r => !selectedRatings.includes(r));
                      const toRemove = selectedRatings.filter(r => !stagedRatings.includes(r));
                      toAdd.forEach(onToggleRating);
                      toRemove.forEach(onToggleRating);
                    }
                    if (onToggleDeviceType) {
                      const toAdd = stagedDeviceTypes.filter(d => !selectedDeviceTypes.includes(d));
                      const toRemove = selectedDeviceTypes.filter(d => !stagedDeviceTypes.includes(d));
                      toAdd.forEach(onToggleDeviceType);
                      toRemove.forEach(onToggleDeviceType);
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
        )}
      </div>
    </div>
  );
}
