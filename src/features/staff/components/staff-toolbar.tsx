"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnOrderState, Table, VisibilityState } from "@tanstack/react-table";
import { IconSettingsSliderThree as FilterIcon } from "central-icons/IconSettingsSliderThree";
import { ChevronDown, SearchIcon } from "lucide-react";
import * as React from "react";
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
import {
  STAFF_ROLES,
  getStaffTypeLabel,
} from "@/features/staff/constants";
import { useTRPC } from "@/trpc/client";
import type { StaffRow } from "../types";

export type StaffToolbarFilters = {
  roles: string[];
  staffTypes: string[];
  status: boolean | null;
};

const sortOptions = [
  { value: "createdAt.desc", label: "Newest first" },
  { value: "createdAt.asc", label: "Oldest first" },
  { value: "name.asc", label: "Name A to Z" },
  { value: "name.desc", label: "Name Z to A" },
  { value: "role.asc", label: "Role A to Z" },
  { value: "staffType.asc", label: "Role A to Z" },
];

const statusOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export function StaffToolbar({
  search,
  onSearchChange,
  sortValue,
  onSortChange,
  selectedRoles,
  selectedStaffTypes,
  selectedStatus,
  onApplyFilters,
  table,
  selectedLocationId,
  includeAllLocations,
}: {
  search: string;
  onSearchChange: (search: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  selectedRoles: string[];
  selectedStaffTypes: string[];
  selectedStatus: boolean | null;
  onApplyFilters: (filters: StaffToolbarFilters) => void;
  table: Table<StaffRow>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  selectedLocationId?: string;
  includeAllLocations?: boolean;
}) {
  const trpc = useTRPC();
  const [searchInput, setSearchInput] = React.useState(search);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [stagedRoles, setStagedRoles] = React.useState<string[]>(selectedRoles);
  const [stagedTypes, setStagedTypes] = React.useState<string[]>(selectedStaffTypes);
  const [stagedStatus, setStagedStatus] = React.useState<boolean | null>(selectedStatus);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);

  const { data: filterOptions } = useSuspenseQuery(
    trpc.staff.filterOptions.queryOptions({
      locationId: selectedLocationId,
      includeAllLocations,
    }),
  );

  React.useEffect(() => setSearchInput(search), [search]);
  React.useEffect(() => setStagedRoles(selectedRoles), [selectedRoles]);
  React.useEffect(() => setStagedTypes(selectedStaffTypes), [selectedStaffTypes]);
  React.useEffect(() => setStagedStatus(selectedStatus), [selectedStatus]);

  const staffTypeOptions = React.useMemo(
    () => {
      const dynamicTypes = filterOptions.staffTypes.filter(
        (staffType) => !STAFF_ROLES.some((role) => role.value === staffType),
      );

      return [
        ...STAFF_ROLES.map((role) => ({
          value: role.value,
          label: role.label,
        })),
        ...dynamicTypes.map((staffType) => ({
        value: staffType,
        label: getStaffTypeLabel(staffType),
        })),
      ];
    },
    [filterOptions.staffTypes],
  );

  const hasFilters =
    selectedRoles.length > 0 ||
    selectedStaffTypes.length > 0 ||
    selectedStatus !== null;

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const toggleValue = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  return (
    <div className="flex w-full items-center justify-between gap-2 py-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative flex h-8.5 w-full max-w-lg items-center rounded-lg bg-background transition hover:bg-primary-foreground/50">
          <SearchIcon className="absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-primary/50" />
          <Input
            placeholder="Search team members by name, email, phone, or role..."
            value={searchInput}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="w-full border-none bg-transparent! pl-8 pr-10 text-xs hover:bg-transparent"
          />
          <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DropdownMenuTrigger asChild>
              <Button className="absolute right-0 border-none bg-transparent hover:bg-transparent">
                <FilterIcon className="size-4 text-primary/80 dark:text-white/60" />
                {hasFilters && (
                  <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-blue-500" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-2 w-[300px] rounded-lg p-1">
              <div className="px-4 py-2.5 text-xs text-primary/80 dark:text-white/60">
                Filters
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Role</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="ml-2.5 w-[280px] p-3">
                  {staffTypeOptions.map((type) => (
                    <FilterOption
                      key={type.value}
                      checked={stagedTypes.includes(type.value)}
                      label={type.label}
                      onToggle={() => toggleValue(type.value, setStagedTypes)}
                    />
                  ))}
                  <ClearButton onClick={() => setStagedTypes([])} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="ml-2.5 w-[280px] p-3">
                  {statusOptions.map((status) => {
                    const value = status.value === "true";
                    return (
                      <FilterOption
                        key={status.value}
                        checked={stagedStatus === value}
                        label={status.label}
                        onToggle={() =>
                          setStagedStatus((prev) => (prev === value ? null : value))
                        }
                      />
                    );
                  })}
                  <ClearButton onClick={() => setStagedStatus(null)} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <Button
                variant="filter"
                onClick={() => {
                  onApplyFilters({
                    roles: [],
                    staffTypes: stagedTypes,
                    status: stagedStatus,
                  });
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
          <DropdownMenuContent align="start" className="w-[220px] rounded-lg p-1">
            {sortOptions.map((option) => (
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

function FilterOption({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex cursor-pointer items-center gap-2 rounded-lg py-2 text-xs text-primary"
      onClick={onToggle}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} onClick={(event) => event.stopPropagation()} />
      <span className="select-none">{label}</span>
    </div>
  );
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="pt-2">
      <Button variant="outline" className="w-full" onClick={onClick}>
        Clear
      </Button>
    </div>
  );
}
