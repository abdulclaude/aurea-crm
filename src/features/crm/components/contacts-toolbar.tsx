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
import { useSuspenseQuery } from "@tanstack/react-query";
import type {
  ColumnOrderState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";
import { IconEyeSlash as EyeIcon } from "central-icons/IconEyeSlash";
import { IconSettingsSliderThree as FilterIcon } from "central-icons/IconSettingsSliderThree";

import { IconContacts as ContactTypeIcon } from "central-icons/IconContacts";
import { IconPeopleCircle as AssigneeIcon } from "central-icons/IconPeopleCircle";
import { IconCalenderAdd as CreatedAtIcon } from "central-icons/IconCalenderAdd";
import { IconLiveActivity as LastActivityIcon } from "central-icons/IconLiveActivity";
import { IconCalendarEdit as LastUpdatedIcon } from "central-icons/IconCalendarEdit";

import {
  CheckIcon,
  ChevronDown,
  GripVerticalIcon,
  SearchIcon,
} from "lucide-react";
import * as React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import DateRangeFilter from "@/components/ui/date-range-filter";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

export interface ContactsToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  selectedTypes: string[];
  onApplyTypes: (types: string[]) => void;
  selectedTags: string[];
  onApplyTags: (tags: string[]) => void;
  selectedAssignees: string[];
  onApplyAssignees: (assignees: string[]) => void;
  onApplyAllFilters: (
    types: string[],
    tags: string[],
    assignees: string[]
  ) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  table: Table<any>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
  createdAtStart?: Date;
  createdAtEnd?: Date;
  onCreatedAtChange?: (start?: Date, end?: Date) => void;
  lastActivityStart?: Date;
  lastActivityEnd?: Date;
  onLastActivityChange?: (start?: Date, end?: Date) => void;
  updatedAtStart?: Date;
  updatedAtEnd?: Date;
  onUpdatedAtChange?: (start?: Date, end?: Date) => void;
}

const contactTypeOptions = ["LEAD", "PROSPECT", "CUSTOMER", "CHURN", "CLOSED"];

const sortOptions = [
  { value: "name.asc", label: "Name A → Z" },
  { value: "name.desc", label: "Name Z → A" },
  { value: "companyName.asc", label: "Company A → Z" },
  { value: "companyName.desc", label: "Company Z → A" },
  { value: "createdAt.desc", label: "Newest first" },
  { value: "createdAt.asc", label: "Oldest first" },
  { value: "updatedAt.desc", label: "Recently updated" },
  { value: "updatedAt.asc", label: "Oldest updates" },
];

const PRIMARY_COLUMN_ID = "name";

export function ContactsToolbar({
  search,
  onSearchChange,
  selectedTypes,
  onApplyTypes,
  selectedTags,
  onApplyTags,
  selectedAssignees,
  onApplyAssignees,
  onApplyAllFilters,
  sortValue,
  onSortChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
  createdAtStart,
  createdAtEnd,
  onCreatedAtChange,
  lastActivityStart,
  lastActivityEnd,
  onLastActivityChange,
  updatedAtStart,
  updatedAtEnd,
  onUpdatedAtChange,
}: ContactsToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(search);
  const debouncedSearch = useDebouncedCallback(onSearchChange, 500);
  const [tempSelectedTypes, setTempSelectedTypes] =
    React.useState<string[]>(selectedTypes);
  const [tempSelectedTags, setTempSelectedTags] =
    React.useState<string[]>(selectedTags);
  const [tempSelectedAssignees, setTempSelectedAssignees] =
    React.useState<string[]>(selectedAssignees);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const trpc = useTRPC();

  // Fetch available members for assignment filter
  const { data: members = [] } = useSuspenseQuery(
    trpc.contacts.getSubaccountMembers.queryOptions()
  );

  // Fetch ALL contacts (unfiltered) for preview calculation
  const { data: allContactsData } = useSuspenseQuery(
    trpc.contacts.list.queryOptions({})
  );

  // Fetch date range for filters
  const { data: dateRange } = useSuspenseQuery(
    trpc.contacts.dateRange.queryOptions()
  );

  const allContacts = React.useMemo(
    () => allContactsData?.items || [],
    [allContactsData]
  );

  // Get unique tags from all contacts
  const availableTags = React.useMemo(() => {
    const tags = new Set<string>();
    allContacts.forEach((contact) => {
      const contactTags = contact.tags || [];
      contactTags.forEach((tag: string) => {
        tags.add(tag);
      });
    });
    return Array.from(tags).sort();
  }, [allContacts]);

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    setTempSelectedTypes(selectedTypes);
  }, [selectedTypes]);

  React.useEffect(() => {
    setTempSelectedTags(selectedTags);
  }, [selectedTags]);

  React.useEffect(() => {
    setTempSelectedAssignees(selectedAssignees);
  }, [selectedAssignees]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleToggleType = (value: string) => {
    setTempSelectedTypes((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleToggleTag = (value: string) => {
    setTempSelectedTags((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleToggleAssignee = (value: string) => {
    setTempSelectedAssignees((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const hasFiltersApplied =
    tempSelectedTypes.length > 0 ||
    tempSelectedTags.length > 0 ||
    tempSelectedAssignees.length > 0;

  // Calculate preview count considering ALL staged filters combined
  const previewCount = React.useMemo(() => {
    const filtered = allContacts.filter((contact) => {
      // Check types filter (if any selected)
      if (tempSelectedTypes.length > 0) {
        if (!tempSelectedTypes.includes(contact.type)) {
          return false;
        }
      }

      // Check tags filter (if any selected)
      if (tempSelectedTags.length > 0) {
        const contactTags = contact.tags || [];
        const hasMatchingTag = tempSelectedTags.some((tag: string) =>
          contactTags.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Check assignees filter (if any selected)
      if (tempSelectedAssignees.length > 0) {
        const contactAssignees = contact.assignees || [];
        const hasMatchingAssignee = contactAssignees.some((assignee: any) =>
          tempSelectedAssignees.includes(assignee.id)
        );
        if (!hasMatchingAssignee) {
          return false;
        }
      }

      return true;
    });

    return filtered.length;
  }, [allContacts, tempSelectedTypes, tempSelectedTags, tempSelectedAssignees]);

  return (
    <div className="flex justify-between w-full items-center">
      <div className="flex items-center gap-2 w-full">
        {/* Search with filters inside */}
        <div className="flex w-128 items-center bg-background transition duration-250 relative hover:bg-primary-foreground/50 hover:text-black rounded-lg h-8.5">
          <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />

          <Input
            placeholder="Search contacts by name, email, company..."
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

              {/* Contact Type Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs px-3 py-3 hover:bg-primary-foreground/50 hover:text-black rounded-lg">
                  <ContactTypeIcon className="size-4" />
                  Contact Type
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-1 w-[280px] ml-2.5"
                  alignOffset={-5}
                >
                  <div className="max-h-64 overflow-auto pr-1">
                    {contactTypeOptions.map((option) => {
                      const selected = tempSelectedTypes.includes(option);
                      return (
                        <div
                          key={option}
                          className="flex items-center gap-2 pt-3 pb-2 px-2 text-xs cursor-pointer rounded-lg group"
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => handleToggleType(option)}
                            className="rounded-lg border-black/10 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground/50 hover:text-black data-[state=checked]:bg-primary-foreground/50 data-[state=checked]:text-black"
                          />
                          <span className="select-none">
                            {option.charAt(0) + option.slice(1).toLowerCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-3 flex gap-2">
                    <Button
                      className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempSelectedTypes([]);
                      }}
                    >
                      Clear
                    </Button>
                    {/* <Button
                      className="flex-1 border border-white/5 bg-[#202e32] hover:bg-[#202e32] hover:brightness-120  text-xs text-white py-3 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyTypes(tempSelectedTypes);
                        setFiltersOpen(false);
                      }}
                    >
                      {`Show ${previewCount} contacts`}
                    </Button> */}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Tags Filter */}
              {availableTags.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs px-4 py-3 hover:brightness-120 rounded-lg">
                    Tags
                  </DropdownMenuSubTrigger>

                  <DropdownMenuSubContent
                    className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-3 pt-2 w-[280px] ml-2.5"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {availableTags.map((tag) => {
                        const selected = tempSelectedTags.includes(tag);
                        return (
                          <div
                            key={tag}
                            className="flex items-center gap-2 py-2 text-xs cursor-pointer rounded-lg group"
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => handleToggleTag(tag)}
                              className="rounded-lg border-black/10 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground/50 hover:text-black data-[state=checked]:bg-primary-foreground/50 data-[state=checked]:text-black"
                            />
                            <span className="select-none">{tag}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-3 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempSelectedTags([]);
                        }}
                      >
                        Clear
                      </Button>
                      {/* <Button
                        className="flex-1 border border-white/5 bg-[#202e32] hover:bg-[#202e32] hover:brightness-120  text-xs text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyTags(tempSelectedTags);
                          setFiltersOpen(false);
                        }}
                      >
                        {`Show ${previewCount} contacts`}
                      </Button> */}
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Assigned To Filter */}
              {members.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs px-3 py-3 hover:bg-primary-foreground! hover:text-black rounded-lg">
                    <AssigneeIcon className="size-4" />
                    Assignee
                  </DropdownMenuSubTrigger>

                  <DropdownMenuSubContent
                    className="rounded-lg bg-background border border-black/10 dark:border-white/5 w-[280px] ml-2.5 p-1"
                    alignOffset={-5}
                  >
                    <div className="max-h-64 overflow-auto pr-1">
                      {members.map((member: any) => {
                        const selected = tempSelectedAssignees.includes(
                          member.id
                        );
                        const initials = member.name
                          ? member.name
                              .split(" ")
                              .map((part: string) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()
                          : "U";
                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 pt-3 pb-2 px-2 text-xs cursor-pointer rounded-lg group"
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() =>
                                handleToggleAssignee(member.id)
                              }
                              className="rounded-lg border-black/10 dark:border-white/5 cursor-pointer group-hover:bg-primary-foreground/50 hover:text-black data-[state=checked]:bg-primary-foreground/50 data-[state=checked]:text-black"
                            />
                            <Avatar className="size-6">
                              {member.image ? (
                                <AvatarImage
                                  src={member.image}
                                  alt={member.name ?? ""}
                                />
                              ) : (
                                <AvatarFallback className="bg-[#202e32] brightness-120 text-[10px] text-white">
                                  {initials}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="select-none truncate">
                              {member.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-3 flex gap-2">
                      <Button
                        className="flex-1 border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-black dark:text-white py-3 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempSelectedAssignees([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Created At Date Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs px-3 py-3 hover:bg-primary-foreground! hover:text-black rounded-lg">
                  <CreatedAtIcon className="size-4" />
                  Created Date
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-4 w-auto ml-2.5"
                  alignOffset={-5}
                >
                  <DateRangeFilter
                    minDate={dateRange?.minDate || new Date(2020, 0, 1)}
                    maxDate={dateRange?.maxDate || new Date()}
                    valueStart={createdAtStart}
                    valueEnd={createdAtEnd}
                    onChange={(start, end) => onCreatedAtChange?.(start, end)}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Last Activity Date Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs px-3 py-3 hover:bg-primary-foreground! hover:text-black rounded-lg">
                  <LastActivityIcon className="size-4" />
                  Last Activity
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-4 w-auto ml-2.5"
                  alignOffset={-5}
                >
                  <DateRangeFilter
                    minDate={dateRange?.minDate || new Date(2020, 0, 1)}
                    maxDate={dateRange?.maxDate || new Date()}
                    valueStart={lastActivityStart}
                    valueEnd={lastActivityEnd}
                    onChange={(start, end) =>
                      onLastActivityChange?.(start, end)
                    }
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Updated At Date Filter */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs px-3 py-3 hover:bg-primary-foreground! hover:text-black rounded-lg">
                  <LastUpdatedIcon className="size-4" />
                  Last Updated
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 p-4 w-auto ml-2.5"
                  alignOffset={-5}
                >
                  <DateRangeFilter
                    minDate={dateRange?.minDate || new Date(2020, 0, 1)}
                    maxDate={dateRange?.maxDate || new Date()}
                    valueStart={updatedAtStart}
                    valueEnd={updatedAtEnd}
                    onChange={(start, end) => onUpdatedAtChange?.(start, end)}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <div className=" pt-1">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyAllFilters(
                      tempSelectedTypes,
                      tempSelectedTags,
                      tempSelectedAssignees
                    );
                    setFiltersOpen(false);
                  }}
                  variant="filter"
                >
                  <span className="drop-shadow-sm">{`Show ${previewCount} contacts`}</span>
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
              <ChevronDown className="size-3 text-primary/80 dark:text-white/60" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="bg-background border border-black/10 dark:border-white/5 w-[220px] p-1"
          >
            {sortOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={sortValue === option.value}
                onSelect={() => {
                  onSortChange(option.value);
                }}
                className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black cursor-pointer"
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
        className="gap-2 rounded-lg bg-background hover:bg-primary-foreground/50 hover:text-black text-xs text-primary/80 dark:text-white font-normal h-8.5!"
        chevron={false}
      >
        <EyeIcon className="size-3" />
        <span className="flex items-center gap-2">Columns</span>
      </SelectTrigger>

      <SelectContent
        className="w-64 border-black/10 dark:border-white/5 bg-background p-0 shadow-2xl backdrop-blur text-primary/80"
        align="end"
      >
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
            className="w-full justify-center px-4! py-2 text-left text-xs text-black font-normal dark:text-white transition bg-background hover:bg-primary-foreground/50 hover:text-black dark:hover:text-white rounded-lg border border-black/15 dark:border-white/5 "
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
        <span className="flex-1 truncate">{label}</span>
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
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-primary/80 dark:text-white/80">
      <CheckIcon className="size-3.5 shrink-0 text-primary/80 dark:text-white" />
      <span className="flex-1 truncate text-primary/80 dark:text-white/80">
        {label}
      </span>
      <span className="rounded-lg bg-primary/80 dark:bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white dark:text-primary/80">
        Locked
      </span>
    </div>
  );
}
