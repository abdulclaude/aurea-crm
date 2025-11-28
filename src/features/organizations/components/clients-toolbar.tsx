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
import {
  CheckIcon,
  ChevronDown,
  GripVerticalIcon,
  SearchIcon,
} from "lucide-react";

import { IconSettingsSliderThree as FilterIcon } from "central-icons/IconSettingsSliderThree";
import { IconEyeSlash as EyeIcon } from "central-icons/IconEyeSlash";

import * as React from "react";
import { useDebouncedCallback } from "use-debounce";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export interface ClientsToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  table: Table<any>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
  selectedCountries?: string[];
  selectedIndustries?: string[];
  onApplyAllFilters?: (filters: {
    countries: string[];
    industries: string[];
  }) => void;
  onClearFilters?: () => void;
}

const sortOptions = [
  { value: "company.asc", label: "Name A → Z" },
  { value: "company.desc", label: "Name Z → A" },
  { value: "workflowsCount.desc", label: "Most workflows" },
  { value: "workflowsCount.asc", label: "Least workflows" },
  { value: "country.asc", label: "Country A → Z" },
  { value: "country.desc", label: "Country Z → A" },
  { value: "createdAt.desc", label: "Newest first" },
  { value: "createdAt.asc", label: "Oldest first" },
];

const PRIMARY_COLUMN_ID = "company";

export function ClientsToolbar({
  search,
  onSearchChange,
  sortValue,
  onSortChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
  selectedCountries = [],
  selectedIndustries = [],
  onApplyAllFilters,
  onClearFilters,
}: ClientsToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const [stagedCountries, setStagedCountries] =
    React.useState<string[]>(selectedCountries);
  const [stagedIndustries, setStagedIndustries] =
    React.useState<string[]>(selectedIndustries);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const trpc = useTRPC();

  // Fetch ALL clients (unfiltered) for filter options and preview calculation
  const { data: allClients = [] } = useSuspenseQuery(
    trpc.organizations.getClients.queryOptions()
  );

  // Sync staged state when props change
  React.useEffect(() => {
    setStagedCountries(selectedCountries);
  }, [selectedCountries]);

  React.useEffect(() => {
    setStagedIndustries(selectedIndustries);
  }, [selectedIndustries]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleToggleCountry = (country: string) => {
    setStagedCountries((prev) =>
      prev.includes(country)
        ? prev.filter((c) => c !== country)
        : [...prev, country]
    );
  };

  const handleToggleIndustry = (industry: string) => {
    setStagedIndustries((prev) =>
      prev.includes(industry)
        ? prev.filter((i) => i !== industry)
        : [...prev, industry]
    );
  };

  const handleApplyFilters = () => {
    onApplyAllFilters?.({
      countries: stagedCountries,
      industries: stagedIndustries,
    });
    setFiltersOpen(false);
  };

  const handleClearAllFilters = () => {
    setStagedCountries([]);
    setStagedIndustries([]);
    onClearFilters?.();
  };

  // Get unique countries and industries from all clients
  const uniqueCountries = React.useMemo(() => {
    const countrySet = new Set<string>();
    allClients.forEach((client) => {
      if (client.profile?.country) {
        countrySet.add(client.profile.country);
      }
    });
    return Array.from(countrySet).sort();
  }, [allClients]);

  const uniqueIndustries = React.useMemo(() => {
    const industrySet = new Set<string>();
    allClients.forEach((client) => {
      if (client.profile?.industry) {
        industrySet.add(client.profile.industry);
      }
    });
    return Array.from(industrySet).sort();
  }, [allClients]);

  // Calculate preview count
  const previewCount = React.useMemo(() => {
    const filtered = allClients.filter((client) => {
      // Country filter
      if (stagedCountries.length > 0) {
        if (
          !client.profile?.country ||
          !stagedCountries.includes(client.profile.country)
        ) {
          return false;
        }
      }

      // Industry filter
      if (stagedIndustries.length > 0) {
        if (
          !client.profile?.industry ||
          !stagedIndustries.includes(client.profile.industry)
        ) {
          return false;
        }
      }

      return true;
    });
    return filtered.length;
  }, [allClients, stagedCountries, stagedIndustries]);

  const hasFiltersApplied =
    selectedCountries.length > 0 || selectedIndustries.length > 0;

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

              {/* Country Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Country</DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                  alignOffset={-5}
                >
                  <div className="max-h-64 overflow-auto pr-1">
                    {uniqueCountries.length === 0 ? (
                      <div className="px-4 py-2.5 text-xs text-primary/75">
                        No countries available
                      </div>
                    ) : (
                      uniqueCountries.map((country) => (
                        <div
                          key={country}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedCountries.includes(country)}
                            onCheckedChange={() => handleToggleCountry(country)}
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground hover:brightness-120 data-[state=checked]:brightness-120 data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">{country}</span>
                        </div>
                      ))
                    )}
                  </div>
                  {uniqueCountries.length > 0 && (
                    <div className="pt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStagedCountries([])}
                        className="flex-1 text-xs h-7 border-black/10 dark:border-white/5 bg-background"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Industry Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Industry</DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                  alignOffset={-5}
                >
                  <div className="max-h-64 overflow-auto pr-1">
                    {uniqueIndustries.length === 0 ? (
                      <div className="px-4 py-2.5 text-xs text-primary/75">
                        No industries available
                      </div>
                    ) : (
                      uniqueIndustries.map((industry) => (
                        <div
                          key={industry}
                          className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={stagedIndustries.includes(industry)}
                            onCheckedChange={() =>
                              handleToggleIndustry(industry)
                            }
                            className="rounded-lg border-black/5 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground data-[state=checked]:bg-primary-foreground hover:brightness-120 data-[state=checked]:brightness-120 data-[state=checked]:border-black/5 dark:data-[state=checked]:border-white/5"
                          />
                          <span className="select-none">{industry}</span>
                        </div>
                      ))
                    )}
                  </div>
                  {uniqueIndustries.length > 0 && (
                    <div className="pt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStagedIndustries([])}
                        className="flex-1 text-xs h-7 border-black/10 dark:border-white/5 bg-background"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <div className="pt-1">
                <DropdownMenuSeparator className="bg-black/10 dark:bg-white/5" />
              </div>

              <div className="p-3 space-y-2">
                <Button
                  onClick={handleApplyFilters}
                  className="w-full justify-center text-xs h-8 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:brightness-90"
                >
                  Show {previewCount} client{previewCount !== 1 ? "s" : ""}
                </Button>
                {hasFiltersApplied && (
                  <Button
                    variant="ghost"
                    onClick={handleClearAllFilters}
                    className="w-full justify-center text-xs h-7 text-primary/80 dark:text-white/60 hover:text-primary dark:hover:text-white hover:bg-primary-foreground/50"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8.5" variant="outline">
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
                checked={sortValue === option.value}
                onCheckedChange={() => onSortChange(option.value)}
                className="text-xs cursor-pointer"
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

// ColumnControls component
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
      <SelectTrigger className="h-8.5!">
        <EyeIcon className="size-3 text-primary/80 dark:text-white/60" />
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

        <div className="px-1">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start px-3 py-2 text-left text-xs text-primary dark:text-white transition bg-transparent hover:bg-primary-foreground/50 hover:text-black rounded-lg"
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
      className={cn("flex items-center gap-2 px-1", isDragging && "opacity-70")}
    >
      <button
        type="button"
        className={cn(
          "flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition hover:bg-primary-foreground/50 hover:text-black",
          !checked && "text-primary/30"
        )}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        <CheckIcon
          className={cn(
            "size-3 shrink-0 text-primary transition",
            checked ? "opacity-100" : "opacity-0"
          )}
        />
        <span className="flex-1 truncate">{label}</span>
      </button>
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab rounded-lg pr-2 pl-1 text-primary/40 transition hover:text-primary/90"
      >
        <GripVerticalIcon className="size-3.5" />
      </span>
    </div>
  );
}

function FixedColumnRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-primary/80">
      <CheckIcon className="size-3.5 shrink-0 text-primary" />
      <span className="flex-1 truncate">{label}</span>
      <span className="rounded-lg bg-black/5 dark:bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary/60">
        Locked
      </span>
    </div>
  );
}
