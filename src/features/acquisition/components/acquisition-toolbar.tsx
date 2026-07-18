"use client";

import { IconSettingsSliderThree as FilterIcon } from "central-icons/IconSettingsSliderThree";
import { CheckIcon, ChevronDown, SearchIcon, EyeIcon } from "lucide-react";
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
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
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
import { GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "INQUIRY", name: "Inquiry" },
  { id: "TRIAL", name: "Trial" },
  { id: "ACTIVE", name: "Active" },
  { id: "LOST", name: "Lost" },
];

const sortOptions = [
  { value: "name.asc", label: "Name A → Z" },
  { value: "name.desc", label: "Name Z → A" },
  { value: "updatedAt.desc", label: "Recently updated" },
  { value: "updatedAt.asc", label: "Oldest first" },
];

export interface AcquisitionToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  selectedStages: string[];
  onStagesChange: (stages: string[]) => void;
  hiddenColumns: string[];
  onHiddenColumnsChange: (hidden: string[]) => void;
}

export function AcquisitionToolbar({
  search,
  onSearchChange,
  sortValue,
  onSortChange,
  selectedStages,
  onStagesChange,
  hiddenColumns,
  onHiddenColumnsChange,
}: AcquisitionToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const [stagedStages, setStagedStages] =
    React.useState<string[]>(selectedStages);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    setStagedStages(selectedStages);
  }, [selectedStages]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleToggleStage = (stage: string) => {
    setStagedStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage],
    );
  };

  const hasFiltersApplied = selectedStages.length > 0;

  const toggleColumnVisibility = (columnId: string) => {
    if (hiddenColumns.includes(columnId)) {
      onHiddenColumnsChange(hiddenColumns.filter((id) => id !== columnId));
    } else {
      onHiddenColumnsChange([...hiddenColumns, columnId]);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 px-6 py-3 border-b border-black/5 dark:border-white/5">
      <div className="flex items-center gap-2">
        {/* Search with filter icon inside */}
        <div className="flex w-80 items-center bg-background transition duration-250 relative hover:bg-primary-foreground/50 rounded-lg h-8.5">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />
          <Input
            placeholder="Search members..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="text-xs px-0 border-none bg-transparent! hover:bg-transparent w-full pl-8"
          />

          <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DropdownMenuTrigger asChild>
              <Button className="text-[11px] bg-transparent hover:bg-transparent border-none absolute right-0">
                <FilterIcon className="text-primary/80 dark:text-white/60 size-4 hover:text-black" />
                {hasFiltersApplied && (
                  <span className="absolute -top-1 -right-1 size-3 rounded-full bg-blue-500 border-2 border-white" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-lg border border-black/10 dark:border-white/5 w-[260px] p-1 mt-2"
            >
              <DropdownMenuSub>
                <h1 className="text-xs text-primary/80 dark:text-white/60 px-4 py-2.5">
                  Filters
                </h1>
              </DropdownMenuSub>
              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Stage</DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[220px] ml-2.5"
                  alignOffset={-5}
                >
                  <div className="space-y-1">
                    {COLUMNS.map((col) => (
                      <div
                        key={col.id}
                        className="flex items-center gap-2 py-2 text-xs text-primary cursor-pointer rounded-lg group px-2 hover:bg-primary-foreground/30"
                        onClick={() => handleToggleStage(col.id)}
                      >
                        <Checkbox
                          checked={stagedStages.includes(col.id)}
                          onCheckedChange={() => handleToggleStage(col.id)}
                          className="rounded-lg border-black/5 dark:border-white/5"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="select-none font-medium">
                          {col.name}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2">
                    <Button
                      className="w-full border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
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

              <div className="pt-1">
                <Button
                  className="w-full border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStagesChange(stagedStages);
                    setFiltersOpen(false);
                  }}
                >
                  Apply filters
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sort */}
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
                checked={sortValue === option.value}
                onSelect={() => onSortChange(option.value)}
                className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black rounded-lg cursor-pointer"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Column visibility (Kanban columns) */}
      <ColumnVisibilityControl
        hiddenColumns={hiddenColumns}
        onToggle={toggleColumnVisibility}
      />
    </div>
  );
}

function ColumnVisibilityControl({
  hiddenColumns,
  onToggle,
}: {
  hiddenColumns: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value="columns"
      onValueChange={() => {}}
    >
      <SelectTrigger
        className="gap-2 rounded-lg bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-primary/80 font-normal h-8.5! w-auto"
        chevron={false}
      >
        <EyeIcon className="size-3.5 dark:text-white/60" />
        <span>Columns</span>
      </SelectTrigger>
      <SelectContent
        className="w-52 border-black/10 dark:border-white/5 bg-background p-0 shadow-2xl backdrop-blur rounded-lg text-primary/80"
        align="end"
      >
        <div className="flex flex-col gap-1 py-2">
          {COLUMNS.map((col) => {
            const visible = !hiddenColumns.includes(col.id);
            return (
              <button
                key={col.id}
                type="button"
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-lg mx-2 px-2 py-2 text-left text-xs transition hover:bg-primary-foreground/50 hover:text-black dark:hover:text-white",
                  !visible && "text-primary/50 dark:text-white/30",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  onToggle(col.id);
                }}
              >
                <CheckIcon
                  className={cn(
                    "size-3.5 shrink-0 text-primary/80 dark:text-white transition",
                    visible ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="flex-1 truncate text-primary/80 dark:text-white">
                  {col.name}
                </span>
              </button>
            );
          })}
        </div>
      </SelectContent>
    </Select>
  );
}
