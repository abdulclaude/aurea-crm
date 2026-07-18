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
import type { ReportCatalogItem } from "@/features/reports/types";

import { ReportFiltersMenu } from "./report-filters-menu";
import type {
  ReportFilterOption,
  ReportFilterState,
} from "./report-table-types";

type ReportCatalogToolbarProps = {
  columnLabels: Readonly<Record<string, string>>;
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
  filters: readonly ReportFilterOption[];
  initialColumnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  onFiltersChange: (filters: ReportFilterState) => void;
  onSearchChange: (search: string) => void;
  onSortingChange: (sorting: SortingState) => void;
  previewCount: number;
  search: string;
  selectedFilters: ReportFilterState;
  sorting: SortingState;
  table: Table<ReportCatalogItem>;
};

const primaryColumnId = "name";

export function ReportCatalogToolbar({
  columnLabels,
  columnOrder,
  columnVisibility,
  filters,
  initialColumnOrder,
  onColumnOrderChange,
  onFiltersChange,
  onSearchChange,
  onSortingChange,
  previewCount,
  search,
  selectedFilters,
  sorting,
  table,
}: ReportCatalogToolbarProps) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState(search);
  const [stagedFilters, setStagedFilters] =
    React.useState<ReportFilterState>(selectedFilters);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const sortableColumnIds = React.useMemo(
    () => initialColumnOrder.filter((columnId) => columnId !== "actions"),
    [initialColumnOrder],
  );
  const sortOptions = React.useMemo(
    () =>
      sortableColumnIds.flatMap((fieldId) => [
        { value: `${fieldId}.asc`, label: `${columnLabels[fieldId]} A-Z` },
        { value: `${fieldId}.desc`, label: `${columnLabels[fieldId]} Z-A` },
      ]),
    [columnLabels, sortableColumnIds],
  );
  const activeSort = sorting[0]
    ? `${sorting[0].id}.${sorting[0].desc ? "desc" : "asc"}`
    : "name.asc";
  const hasFiltersApplied = Object.values(selectedFilters).some(
    (values) => values.length > 0,
  );

  React.useEffect(() => setSearchInput(search), [search]);
  React.useEffect(() => setStagedFilters(selectedFilters), [selectedFilters]);

  return (
    <div className="flex w-full items-center justify-between py-4">
      <div className="flex w-full items-center gap-2">
        <div className="relative flex h-8.5 w-128 items-center rounded-lg bg-background transition duration-250 hover:bg-primary-foreground/50 hover:text-black">
          <SearchIcon className="absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-primary/50" />
          <Input
            placeholder="Search reports..."
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.currentTarget.value);
              debouncedSearch(event.currentTarget.value);
            }}
            className="w-128 border-none bg-transparent! px-0 pl-8 text-xs hover:bg-transparent"
          />
          <ReportFiltersMenu
            filters={filters}
            hasFiltersApplied={hasFiltersApplied}
            onApply={() => {
              onFiltersChange(stagedFilters);
              setFiltersOpen(false);
            }}
            onToggle={(fieldId, value) => {
              setStagedFilters((previous) =>
                toggleFilter(previous, fieldId, value),
              );
            }}
            open={filtersOpen}
            previewCount={previewCount}
            previewIsPartial={false}
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
            className="w-[220px] rounded-lg border border-black/10 bg-background p-1 dark:border-white/5"
          >
            {sortOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={activeSort === option.value}
                onSelect={() => onSortingChange(sortValueToState(option.value))}
                className="cursor-pointer rounded-lg bg-background px-10 py-2.5 text-xs text-primary/80 hover:bg-primary-foreground/50 hover:text-black"
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
