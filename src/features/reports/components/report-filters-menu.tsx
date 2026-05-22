"use client";

import { IconSettingsSliderThree as FilterIcon } from "central-icons/IconSettingsSliderThree";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import DateRangeFilter from "@/components/ui/date-range-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type {
  ReportDateFilter,
  ReportFilterOption,
  ReportFilterState,
} from "./report-table-types";

type ReportFiltersMenuProps = {
  dateFilter?: ReportDateFilter;
  filters: readonly ReportFilterOption[];
  hasFiltersApplied: boolean;
  onApply: () => void;
  onToggle: (fieldId: string, value: string) => void;
  open: boolean;
  previewCount: number;
  selectedFilters: ReportFilterState;
  setOpen: (open: boolean) => void;
};

export function ReportFiltersMenu({
  dateFilter,
  filters,
  hasFiltersApplied,
  onApply,
  onToggle,
  open,
  previewCount,
  selectedFilters,
  setOpen,
}: ReportFiltersMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="text-[11px] bg-transparent hover:bg-transparent border-none absolute right-0">
          <FilterIcon className="text-primary/80 dark:text-white/60 size-4 hover:text-black" />
          {hasFiltersApplied ? (
            <span className="absolute -top-1 -right-1 size-3 rounded-full bg-blue-500 border-2 border-white" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-lg border border-black/10 dark:border-white/5 w-[300px] p-1 mt-2 -mr-[9px]"
      >
        <div className="text-xs text-primary/80 dark:text-white/60 px-4 py-2.5">
          Filters
        </div>
        <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
        {dateFilter ? (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs px-3 py-3 hover:bg-primary-foreground! hover:text-black rounded-lg">
                <CalendarIcon className="size-4" />
                {dateFilter.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-4 w-auto ml-2.5"
                alignOffset={-5}
              >
                <DateRangeFilter
                  minDate={dateFilter.minDate}
                  maxDate={dateFilter.maxDate}
                  valueStart={dateFilter.valueStart}
                  valueEnd={dateFilter.valueEnd}
                  onChange={dateFilter.onChange}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
          </>
        ) : null}
        {filters.length > 0 ? (
          filters.map((filter) => (
            <DropdownMenuSub key={filter.fieldId}>
              <DropdownMenuSubTrigger>{filter.label}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                alignOffset={-5}
              >
                <div className="max-h-64 overflow-auto pr-1">
                  {filter.values.map((value) => (
                    <FilterOptionRow
                      key={value}
                      checked={(selectedFilters[filter.fieldId] ?? []).includes(
                        value,
                      )}
                      label={value}
                      onToggle={() => onToggle(filter.fieldId, value)}
                    />
                  ))}
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))
        ) : (
          <div className="px-4 py-6 text-center text-xs text-primary/55">
            No filter values yet.
          </div>
        )}
        <div className="pt-1">
          <Button
            className="w-full border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
            onClick={(event) => {
              event.stopPropagation();
              onApply();
            }}
          >
            {`Show ${previewCount} rows`}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterOptionRow({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground hover:bg-accent data-[state=checked]:bg-accent data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
      />
      <span className="select-none">{label}</span>
    </div>
  );
}
