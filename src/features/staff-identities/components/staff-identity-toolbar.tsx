"use client";

import type { Table } from "@tanstack/react-table";
import { IconSettingsSliderThree as FilterIcon } from "central-icons/IconSettingsSliderThree";
import { ChevronDown, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  STAFF_IDENTITY_STATUSES,
  type StaffIdentityRow,
  type StaffIdentityStatus,
} from "@/features/staff-identities/contracts";

export type StaffIdentitySort =
  | "createdAt.desc"
  | "createdAt.asc"
  | "name.asc"
  | "name.desc"
  | "status.asc";

const SORT_OPTIONS: { value: StaffIdentitySort; label: string }[] = [
  { value: "createdAt.desc", label: "Newest first" },
  { value: "createdAt.asc", label: "Oldest first" },
  { value: "name.asc", label: "Name A to Z" },
  { value: "name.desc", label: "Name Z to A" },
  { value: "status.asc", label: "Status A to Z" },
];

function statusLabel(status: StaffIdentityStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function StaffIdentityToolbar({
  search,
  onSearchChange,
  sortValue,
  onSortChange,
  selectedStatuses,
  onStatusesChange,
  table,
}: {
  search: string;
  onSearchChange: (search: string) => void;
  sortValue: StaffIdentitySort;
  onSortChange: (sort: StaffIdentitySort) => void;
  selectedStatuses: StaffIdentityStatus[];
  onStatusesChange: (statuses: StaffIdentityStatus[]) => void;
  table: Table<StaffIdentityRow>;
}) {
  const [searchInput, setSearchInput] = useState(search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stagedStatuses, setStagedStatuses] =
    useState<StaffIdentityStatus[]>(selectedStatuses);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);

  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => setStagedStatuses(selectedStatuses), [selectedStatuses]);

  return (
    <div className="flex w-full items-center justify-between gap-2 py-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative flex h-8.5 w-full max-w-lg items-center rounded-lg bg-background transition hover:bg-primary-foreground/50">
          <SearchIcon className="absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-primary/50" />
          <Input
            placeholder="Search directory by name, email, phone, or profile..."
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              debouncedSearch(event.target.value);
            }}
            className="w-full border-none bg-transparent! pl-8 pr-10 text-xs hover:bg-transparent"
          />
          <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Filter directory"
                className="absolute right-0 border-none bg-transparent hover:bg-transparent"
              >
                <FilterIcon className="size-4 text-primary/80 dark:text-white/60" />
                {selectedStatuses.length > 0 ? (
                  <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-blue-500" />
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="mt-2 w-[300px] rounded-lg p-1"
            >
              <div className="px-4 py-2.5 text-xs text-primary/80 dark:text-white/60">
                Status
              </div>
              <DropdownMenuSeparator />
              <div className="space-y-1 p-3">
                {STAFF_IDENTITY_STATUSES.map((status) => (
                  <label
                    key={status}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-primary/5"
                  >
                    <Checkbox
                      checked={stagedStatuses.includes(status)}
                      onCheckedChange={() =>
                        setStagedStatuses((current) =>
                          current.includes(status)
                            ? current.filter((value) => value !== status)
                            : [...current, status],
                        )
                      }
                    />
                    {statusLabel(status)}
                  </label>
                ))}
              </div>
              <Button
                variant="filter"
                onClick={() => {
                  onStatusesChange(stagedStatuses);
                  setFiltersOpen(false);
                }}
              >
                Apply filters
              </Button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-8.5!">
              Sort by
              <ChevronDown className="ml-1 size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[220px] rounded-lg p-1"
          >
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={sortValue === option.value}
                onSelect={() => onSortChange(option.value)}
                className="cursor-pointer px-10 py-2.5 text-xs"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className="hidden text-[11px] text-primary/50 md:block">
        {table.getRowModel().rows.length} visible
      </span>
    </div>
  );
}
