"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, Users, MapPin, SearchIcon, ChevronDown } from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ClassRow =
  RouterOutput["instructors"]["listMyClasses"]["classes"][number];

const SORTABLE_COLUMNS = new Set(["name", "startTime"]);
const DEFAULT_SORT = "startTime.asc";

function sortValueToState(value?: string): SortingState {
  const sort = value || DEFAULT_SORT;
  const [column, direction] = sort.split(".");
  if (!SORTABLE_COLUMNS.has(column)) return [];
  return [{ id: column, desc: direction === "desc" }];
}

function sortingStateToValue(state: SortingState): string | null {
  const primary = state[0];
  if (!primary || !SORTABLE_COLUMNS.has(primary.id)) return null;
  return `${primary.id}.${primary.desc ? "desc" : "asc"}`;
}

const columns: ColumnDef<ClassRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="max-w-[25px] w-full">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="max-w-[25px] w-full">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Class name",
    meta: { label: "Class" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.classType?.color && (
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: row.original.classType.color }}
          />
        )}
        <span className="text-xs font-medium text-primary">
          {row.original.classType?.name ?? row.original.name}
        </span>
      </div>
    ),
  },
  {
    id: "startTime",
    accessorKey: "startTime",
    header: "Time",
    meta: { label: "Start time" },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-xs text-primary">
          {format(new Date(row.original.startTime), "PPp")}
        </span>
        <span className="text-[11px] text-primary/75">
          {format(new Date(row.original.endTime), "p")} ·{" "}
          {row.original.durationMinutes}min
        </span>
      </div>
    ),
  },
  {
    id: "room",
    header: "Room",
    meta: { label: "Room" },
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        {row.original.room && <MapPin className="h-3.5 w-3.5 text-primary/50" />}
        <span className="text-xs text-primary">
          {row.original.room?.name || "—"}
        </span>
      </div>
    ),
  },
  {
    id: "capacity",
    header: "Bookings",
    meta: { label: "Bookings" },
    cell: ({ row }) => {
      const booked = row.original.bookingCount;
      const max = row.original.maxCapacity;
      const percentage = max ? Math.round((booked / max) * 100) : 0;

      return (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium text-primary">
              {booked} / {max ?? "∞"}
            </p>
            {max && (
              <p className="text-[10px] text-primary/75">{percentage}% full</p>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => {
      const status = row.original.status;
      const colorMap: Record<string, string> = {
        SCHEDULED: "bg-blue-500/10 text-blue-600",
        COMPLETED: "bg-emerald-500/10 text-emerald-600",
        CANCELLED: "bg-red-500/10 text-red-600",
      };
      return (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colorMap[status] ?? "bg-primary/5 text-primary/60"}`}
        >
          {status === "SCHEDULED"
            ? "Scheduled"
            : status === "COMPLETED"
              ? "Completed"
              : status}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="size-8 p-0 hover:bg-primary/5"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-background border-black/5 dark:border-white/5"
        >
          <DropdownMenuLabel className="text-xs text-primary/80 dark:text-white/50">
            Actions
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
          <DropdownMenuItem className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer">
            View details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];

const sortOptions = [
  { value: "name.asc", label: "Name A → Z" },
  { value: "name.desc", label: "Name Z → A" },
  { value: "startTime.asc", label: "Earliest first" },
  { value: "startTime.desc", label: "Latest first" },
];

export function MyClassesTable() {
  const trpc = useTRPC();
  const router = useRouter();
  const [rowSelection, setRowSelection] = React.useState({});

  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [sortParam, setSortParam] = useQueryState(
    "sort",
    parseAsString.withDefault(DEFAULT_SORT),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(20),
  );
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );

  const [localSearch, setLocalSearch] = React.useState(search);
  const debouncedSearch = useDebouncedCallback((val: string) => {
    void setSearch(val);
    void setPage(1);
  }, 300);

  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const { data, isFetching } = useSuspenseQuery(
    trpc.instructors.listMyClasses.queryOptions({
      page,
      pageSize,
      search: search || undefined,
      status: (statusFilter as "upcoming" | "past" | "all") || "all",
    }),
  );

  const sortingState = React.useMemo(
    () => sortValueToState(sortParam),
    [sortParam],
  );

  const handleSortingChange = React.useCallback(
    (state: SortingState) => {
      void setSortParam(sortingStateToValue(state) ?? DEFAULT_SORT);
    },
    [setSortParam],
  );

  const handleRowClick = React.useCallback(
    (cls: ClassRow) => {
      router.push(`/studio/classes/${cls.id}`);
    },
    [router],
  );

  return (
    <DataTable
      data={data.classes}
      columns={columns}
      isLoading={isFetching}
      getRowId={(row) => row.id}
      sorting={sortingState}
      onSortingChange={handleSortingChange}
      initialSorting={[{ id: "startTime", desc: false }]}
      onRowClick={handleRowClick}
      enableRowSelection
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      emptyState={
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50">
          No classes found. <br /> Try adjusting your filters.
        </div>
      }
      toolbar={{
        filters: () => (
          <div className="flex justify-between w-full items-center py-4">
            <div className="flex items-center gap-2">
              <div className="flex w-72 items-center bg-background transition relative hover:bg-primary-foreground/50 rounded-lg h-8.5">
                <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />
                <Input
                  placeholder="Search classes..."
                  value={localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    debouncedSearch(e.target.value);
                  }}
                  className="text-xs px-0 border-none bg-transparent! hover:bg-transparent w-full pl-8"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-8.5!" variant="outline">
                    Sort by{" "}
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
                      checked={sortParam === option.value}
                      onSelect={() => void setSortParam(option.value)}
                      className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black rounded-lg cursor-pointer"
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-8.5!" variant="outline">
                    {statusFilter === "upcoming"
                      ? "Upcoming"
                      : statusFilter === "past"
                        ? "Past"
                        : "All classes"}{" "}
                    <ChevronDown className="size-3 text-primary/80 dark:text-white/60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="rounded-lg bg-background border border-black/10 dark:border-white/5 w-[180px] p-1"
                >
                  {[
                    { value: "all", label: "All classes" },
                    { value: "upcoming", label: "Upcoming" },
                    { value: "past", label: "Past" },
                  ].map((opt) => (
                    <DropdownMenuCheckboxItem
                      key={opt.value}
                      checked={statusFilter === opt.value}
                      onSelect={() => {
                        void setStatusFilter(opt.value);
                        void setPage(1);
                      }}
                      className="px-10 py-2.5 text-xs bg-background text-primary/80 hover:bg-primary-foreground/50 hover:text-black rounded-lg cursor-pointer"
                    >
                      {opt.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ),
      }}
      pagination={{
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        pageSize: data.pagination.pageSize,
        totalItems: data.pagination.totalItems,
        onPageChange: (p) => void setPage(p),
        onPageSizeChange: (s) => {
          void setPageSize(s);
          void setPage(1);
        },
      }}
    />
  );
}
