"use client";

import type {
  ColumnOrderState,
  SortingState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, SearchIcon } from "lucide-react";
import * as React from "react";
import { useDebouncedCallback } from "use-debounce";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ReportColumnControls } from "@/features/reports/components/report-column-controls";
import type { ReportDataRow } from "@/features/reports/types";

import { ReportFiltersMenu } from "./report-filters-menu";
import type {
  ReportDateFilter,
  ReportFilterOption,
  ReportFilterState,
} from "./report-table-types";

type ReportTableToolbarProps = {
  columnLabels: Readonly<Record<string, string>>;
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
  dateFilter?: ReportDateFilter;
  filters: readonly ReportFilterOption[];
  initialColumnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  onFiltersChange: (filters: ReportFilterState) => void;
  onSearchChange: (search: string) => void;
  onSortingChange: (sorting: SortingState) => void;
  primaryColumnId: string;
  previewCount: number;
  search: string;
  selectedFilters: ReportFilterState;
  sorting: SortingState;
  table: Table<ReportDataRow>;
};

export function ReportTableToolbar({
  columnLabels,
  columnOrder,
  columnVisibility,
  dateFilter,
  filters,
  initialColumnOrder,
  onColumnOrderChange,
  onFiltersChange,
  onSearchChange,
  onSortingChange,
  primaryColumnId,
  previewCount,
  search,
  selectedFilters,
  sorting,
  table,
}: ReportTableToolbarProps) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState(search);
  const [stagedFilters, setStagedFilters] =
    React.useState<ReportFilterState>(selectedFilters);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const sortOptions = React.useMemo(
    () =>
      initialColumnOrder.flatMap((fieldId) => [
        { value: `${fieldId}.asc`, label: `${columnLabels[fieldId]} A-Z` },
        { value: `${fieldId}.desc`, label: `${columnLabels[fieldId]} Z-A` },
      ]),
    [columnLabels, initialColumnOrder],
  );
  const activeSort = sorting[0]
    ? `${sorting[0].id}.${sorting[0].desc ? "desc" : "asc"}`
    : `${primaryColumnId}.asc`;
  const hasFiltersApplied = Object.values(selectedFilters).some(
    (values) => values.length > 0,
  );

  React.useEffect(() => setSearchInput(search), [search]);
  React.useEffect(() => setStagedFilters(selectedFilters), [selectedFilters]);

  return (
    <div className="flex justify-between w-full items-center py-4">
      <div className="flex items-center gap-2 w-full">
        <div className="flex w-128 items-center bg-background transition duration-250 relative hover:bg-primary-foreground/50 hover:text-black rounded-lg h-8.5">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />
          <Input
            placeholder="Search report data..."
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.currentTarget.value);
              debouncedSearch(event.currentTarget.value);
            }}
            className="text-xs px-0 border-none bg-transparent! hover:bg-transparent w-128 pl-8"
          />
          <ReportFiltersMenu
            dateFilter={dateFilter}
            filters={filters}
            hasFiltersApplied={hasFiltersApplied || Boolean(dateFilter?.isActive)}
            onApply={() => {
              onFiltersChange(stagedFilters);
              setFiltersOpen(false);
            }}
            onToggle={(fieldId, value) => {
              setStagedFilters((previous) => toggleFilter(previous, fieldId, value));
            }}
            open={filtersOpen}
            previewCount={previewCount}
            selectedFilters={stagedFilters}
            setOpen={setFiltersOpen}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8.5!" variant="outline">
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
                checked={activeSort === option.value}
                onSelect={() => onSortingChange(sortValueToState(option.value))}
                className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black rounded-lg cursor-pointer"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ReportColumnControls
        columnLabels={columnLabels}
        columnOrder={columnOrder}
        columnVisibility={columnVisibility}
        initialColumnOrder={initialColumnOrder}
        onColumnOrderChange={onColumnOrderChange}
        primaryColumnId={primaryColumnId}
        table={table}
      />
    </div>
  );
}

function sortValueToState(value: string): SortingState {
  const [id, direction] = value.split(".");
  if (!id) return [];
  return [{ id, desc: direction === "desc" }];
}

function toggleFilter(
  filters: ReportFilterState,
  fieldId: string,
  value: string,
): ReportFilterState {
  const currentValues = filters[fieldId] ?? [];
  const nextValues = currentValues.includes(value)
    ? currentValues.filter((item) => item !== value)
    : [...currentValues, value];

  return { ...filters, [fieldId]: nextValues };
}
