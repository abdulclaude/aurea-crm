"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  Updater,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { ClassesToolbar } from "./classes-toolbar";
import { ClassCapacityRing } from "./class-capacity-ring";
import { useRouter } from "next/navigation";
import Link from "next/link";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ClassRow = RouterOutput["studioClasses"]["list"]["classes"][number];

const SORTABLE_COLUMNS = new Set(["name", "startTime", "instructorName"]);
const CLASSES_DEFAULT_SORT = "startTime.desc";

const sortValueToState = (value?: string): SortingState => {
  const sort = value || CLASSES_DEFAULT_SORT;
  const [column, direction] = sort.split(".");
  if (!SORTABLE_COLUMNS.has(column)) {
    return [];
  }
  return [
    {
      id: column,
      desc: direction === "desc",
    },
  ];
};

const sortingStateToValue = (state: SortingState): string | null => {
  const primary = state[0];
  if (!primary || !SORTABLE_COLUMNS.has(primary.id)) {
    return null;
  }
  return `${primary.id}.${primary.desc ? "desc" : "asc"}`;
};

const classColumns: ColumnDef<ClassRow>[] = [
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
      <span className="text-xs font-medium text-primary">
        {row.original.name}
      </span>
    ),
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
    meta: { label: "Description" },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs text-primary/75 line-clamp-2 max-w-xs">
        {row.original.description || "—"}
      </span>
    ),
  },
  {
    id: "serviceType",
    header: "Service",
    meta: { label: "Service" },
    enableSorting: false,
    cell: ({ row }) => {
      const serviceName =
        row.original.serviceType?.name ?? row.original.classType?.name;

      const serviceColor =
        row.original.serviceType?.calendarColor ?? row.original.classType?.color;

      return serviceName ? (
        <Badge
          variant="outline"
          className="max-w-44 truncate text-[10px] ring-0"
          style={
            serviceColor
              ? {
                  backgroundColor: `${serviceColor}18`,
                  borderColor: `${serviceColor}66`,
                  color: serviceColor,
                  boxShadow: `0 0 0 1px ${serviceColor}66`,
                }
              : undefined
          }
        >
          {serviceName}
        </Badge>
      ) : (
        <span className="text-xs text-primary/40">Unassigned</span>
      );
    },
  },
  {
    id: "startTime",
    accessorKey: "startTime",
    header: "Class booked",
    meta: { label: "Class booked" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {format(new Date(row.original.startTime), "PPp")}
      </span>
    ),
  },
  {
    id: "duration",
    header: "Class duration",
    meta: { label: "Class duration" },
    cell: ({ row }) => {
      const durationMinutes = Math.max(
        0,
        Math.round(
          (new Date(row.original.endTime).getTime() -
            new Date(row.original.startTime).getTime()) /
            60_000,
        ),
      );

      return (
        <span className="text-xs tabular-nums text-primary/75">
          {durationMinutes} min
        </span>
      );
    },
  },
  {
    id: "instructorName",
    accessorKey: "instructorName",
    header: "Instructor",
    meta: { label: "Instructor" },
    enableSorting: true,
    cell: ({ row }) => {
      const instructorName =
        row.original.instructor?.name ?? row.original.instructorName;
      const initials = instructorName
        ?.split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");

      return instructorName ? (
        <div className="flex items-center gap-2">
          <Avatar className="size-7 overflow-hidden rounded-full">
            {row.original.instructor?.profilePhoto && (
              <AvatarImage
                src={row.original.instructor.profilePhoto}
                alt={instructorName}
                className="object-cover object-top"
              />
            )}
            <AvatarFallback className="rounded-full bg-primary/10 text-[9px] font-medium text-primary/65">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-primary">{instructorName}</span>
        </div>
      ) : (
        <span className="text-xs text-primary/40">—</span>
      );
    },
  },
  {
    id: "room",
    header: "Room",
    meta: { label: "Room" },
    cell: ({ row }) => {
      const roomName = row.original.room?.name ?? row.original.roomName;

      return (
        <div className="min-w-0">
          <span className="block truncate text-xs text-primary">
            {roomName ?? "Unassigned"}
          </span>
          {row.original.location && (
            <span className="block truncate text-[11px] text-primary/50">
              {row.original.location}
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "capacity",
    header: "Capacity",
    meta: { label: "Capacity" },
    cell: ({ row }) => {
      const booked = row.original._count?.studioBooking ?? 0;
      const max = row.original.maxCapacity;
      return <ClassCapacityRing booked={booked} capacity={max} />;
    },
  },
  {
    id: "pricing",
    header: "Pricing",
    meta: { label: "Pricing" },
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-primary">
          {formatPricing(row.original)}
        </span>
        {row.original.pricingModel === "SLIDING_SCALE" && (
          <span className="text-[11px] text-primary/50">
            {formatMoney(
              row.original.slidingScaleMinPrice,
              row.original.currency,
            )}{" "}
            -{" "}
            {formatMoney(
              row.original.slidingScaleMaxPrice,
              row.original.currency,
            )}
          </span>
        )}
      </div>
    ),
  },
  {
    id: "bookingOptions",
    header: "Booking",
    meta: { label: "Booking" },
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.onlineBookingEnabled && (
          <Badge variant="secondary" className="text-[10px]">
            Online
          </Badge>
        )}
        {row.original.waitlistEnabled && (
          <Badge variant="outline" className="text-[10px]">
            Waitlist
          </Badge>
        )}
        {row.original.spotPickingEnabled && (
          <Badge variant="outline" className="text-[10px]">
            Spots
          </Badge>
        )}
      </div>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return (
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
            <DropdownMenuItem asChild>
              <Link
                href={`/studio/classes/${row.original.id}`}
                className="cursor-pointer text-xs text-primary hover:bg-primary-foreground hover:text-black dark:text-white"
                onClick={(event) => event.stopPropagation()}
              >
                View details
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

const PRIMARY_COLUMN_ID = "select";
const CLASS_COLUMN_IDS = classColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string
);
const COLUMN_ORDER_STORAGE_KEY = "studio-classes-table.column-order.v2";

function formatPricing(classItem: ClassRow): string {
  if (classItem.pricingModel === "FREE") return "Free";
  if (classItem.pricingModel === "DROP_IN") {
    return formatMoney(classItem.dropInPrice, classItem.currency);
  }
  if (classItem.pricingModel === "SLIDING_SCALE") return "Sliding scale";
  return "Package only";
}

function formatMoney(
  amount: string | null | undefined,
  currency: string | null | undefined,
): string {
  if (!amount) return "-";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency ?? "GBP",
  }).format(Number(amount));
}

export function ClassesTable() {
  const trpc = useTRPC();
  const router = useRouter();
  const [rowSelection, setRowSelection] = React.useState({});

  // URL search params
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [sortParam, setSortParam] = useQueryState("sort", parseAsString.withDefault(CLASSES_DEFAULT_SORT));
  const [hiddenColumnsParam, setHiddenColumnsParam] = useQueryState("hidden", parseAsString.withDefault(""));

  // Pagination params
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [pageSize, setPageSize] = useQueryState("pageSize", parseAsInteger.withDefault(20));

  // Date filters
  const [startDateStr, setStartDateStr] = useQueryState("startDate", parseAsString.withDefault(""));
  const [endDateStr, setEndDateStr] = useQueryState("endDate", parseAsString.withDefault(""));
  const [instructorFilter, setInstructorFilter] = useQueryState("instructor", parseAsString.withDefault(""));
  const [serviceTypeFilter, setServiceTypeFilter] = useQueryState("serviceType", parseAsString.withDefault(""));
  const [roomFilter, setRoomFilter] = useQueryState("room", parseAsString.withDefault(""));

  // Convert strings to Date objects
  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  // Hidden columns from URL
  const hiddenColumns = React.useMemo(
    () => (hiddenColumnsParam ? hiddenColumnsParam.split(",").filter(Boolean) : []),
    [hiddenColumnsParam]
  );

  const [hydrated, setHydrated] = React.useState(false);
  const classesQuery = useQuery(
    trpc.studioClasses.list.queryOptions({
      page,
      pageSize,
      search: search || undefined,
      startDate: startDateStr || undefined,
      endDate: endDateStr || undefined,
      instructorName: instructorFilter || undefined,
      serviceTypeId: serviceTypeFilter || undefined,
      roomId: roomFilter || undefined,
    })
  );

  const statsQuery = useQuery(trpc.studioClasses.stats.queryOptions());

  const instructorsQuery = useQuery(
    trpc.instructors.list.queryOptions({ pageSize: 100 }),
  );
  const instructors = React.useMemo(
    () =>
      (instructorsQuery.data?.items ?? []).map((instructor) => ({
        id: instructor.id,
        name: instructor.name,
      })),
    [instructorsQuery.data],
  );
  const roomsQuery = useQuery(trpc.rooms.list.queryOptions());
  const rooms = React.useMemo(
    () =>
      (roomsQuery.data ?? []).map((room) => ({
        id: room.id,
        name: room.name,
      })),
    [roomsQuery.data],
  );
  const servicesQuery = useQuery(
    trpc.serviceCatalog.list.queryOptions({
      includeInactive: false,
      experienceType: "CLASS",
    }),
  );
  const serviceTypes = React.useMemo(
    () =>
      (servicesQuery.data ?? []).map((service) => ({
        id: service.id,
        name: service.name,
      })),
    [servicesQuery.data],
  );

  React.useEffect(() => setHydrated(true), []);

  const sortingState = React.useMemo(
    () => sortValueToState(sortParam),
    [sortParam]
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));
  const pendingHiddenRef = React.useRef<string[] | null>(null);
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(CLASS_COLUMN_IDS);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") return;
    const next = normalizeColumnOrder(
      order,
      CLASS_COLUMN_IDS,
      PRIMARY_COLUMN_ID
    );
    if (shallowEqualArrays(next, CLASS_COLUMN_IDS)) {
      window.localStorage.removeItem(COLUMN_ORDER_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(next));
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const next = normalizeColumnOrder(
          parsed,
          CLASS_COLUMN_IDS,
          PRIMARY_COLUMN_ID
        );
        setColumnOrder(next);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (
      pendingHiddenRef.current &&
      shallowEqualArrays(pendingHiddenRef.current, hiddenColumns)
    ) {
      pendingHiddenRef.current = null;
      return;
    }
    setColumnVisibility(visibilityFromHidden(hiddenColumns));
  }, [hiddenColumns]);

  const handleSortingChange = React.useCallback(
    (state: SortingState) => {
      const nextValue = sortingStateToValue(state) ?? CLASSES_DEFAULT_SORT;
      void setSortParam(nextValue);
    },
    [setSortParam]
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      void setSortParam(value);
    },
    [setSortParam]
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      void setSearch(value);
      void setPage(1); // Reset to page 1 on search
    },
    [setSearch, setPage]
  );

  const handleDateRangeChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setStartDateStr(start ? toYMD(start) : "");
      void setEndDateStr(end ? toYMD(end) : "");
      void setPage(1); // Reset to page 1 on filter change
    },
    [setStartDateStr, setEndDateStr, setPage]
  );

  const handleInstructorChange = React.useCallback(
    (value: string) => {
      void setInstructorFilter(value);
      void setPage(1); // Reset to page 1 on filter change
    },
    [setInstructorFilter, setPage]
  );

  const handleRoomChange = React.useCallback(
    (value: string) => {
      void setRoomFilter(value);
      void setPage(1);
    },
    [setRoomFilter, setPage]
  );

  const handleServiceTypeChange = React.useCallback(
    (value: string) => {
      void setServiceTypeFilter(value);
      void setPage(1);
    },
    [setServiceTypeFilter, setPage]
  );

  const handleClearFilters = React.useCallback(() => {
    void setSearch("");
    void setStartDateStr("");
    void setEndDateStr("");
    void setInstructorFilter("");
    void setServiceTypeFilter("");
    void setRoomFilter("");
    void setPage(1);
  }, [setSearch, setStartDateStr, setEndDateStr, setInstructorFilter, setServiceTypeFilter, setRoomFilter, setPage]);

  const handleColumnVisibilityChange = React.useCallback(
    (state: VisibilityState) => {
      const nextState = { ...state };
      setColumnVisibility(nextState);
      const nextHidden = Object.entries(nextState)
        .filter(([, visible]) => visible === false)
        .map(([id]) => id);
      pendingHiddenRef.current = nextHidden;
      void setHiddenColumnsParam(nextHidden.join(","));
    },
    [setHiddenColumnsParam]
  );

  const handleColumnOrderChange = React.useCallback(
    (updater: Updater<ColumnOrderState>) => {
      setColumnOrder((previous) => {
        const resolved = resolveUpdater(updater, previous);
        const next = normalizeColumnOrder(
          resolved,
          CLASS_COLUMN_IDS,
          PRIMARY_COLUMN_ID
        );
        persistColumnOrder(next);
        return next;
      });
    },
    [persistColumnOrder]
  );

  const handleRowClick = React.useCallback(
    (classItem: ClassRow) => {
      router.push(`/studio/classes/${classItem.id}`);
    },
    [router]
  );

  const handlePageChange = React.useCallback(
    (newPage: number) => {
      void setPage(newPage);
    },
    [setPage]
  );

  const handlePageSizeChange = React.useCallback(
    (newPageSize: number) => {
      void setPageSize(newPageSize);
      void setPage(1); // Reset to page 1 when changing page size
    },
    [setPageSize, setPage]
  );

  const relatedQueries = [
    classesQuery,
    statsQuery,
    instructorsQuery,
    roomsQuery,
    servicesQuery,
  ];
  const failedQuery = relatedQueries.find((query) => query.isError);
  const data = classesQuery.data;

  if (!hydrated || relatedQueries.some((query) => query.isLoading)) {
    return (
      <div
        role="status"
        aria-label="Loading studio classes"
        className="h-64 animate-pulse bg-muted/40"
      />
    );
  }

  if (failedQuery || !data || !statsQuery.data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
        <p role="alert" className="text-sm font-medium">
          Studio classes could not be loaded.
        </p>
        <p className="text-xs text-muted-foreground">
          {failedQuery?.error instanceof Error
            ? failedQuery.error.message
            : "Try the request again."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void Promise.all(relatedQueries.map((query) => query.refetch()))
          }
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <DataTable
        data={data.classes}
        columns={classColumns}
        isLoading={relatedQueries.some((query) => query.isFetching)}
        getRowId={(row) => row.id}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={CLASS_COLUMN_IDS}
        initialSorting={[{ id: "startTime", desc: true }]}
        onRowClick={handleRowClick}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
            No classes found. <br /> Try adjusting your filters or sync from Mindbody.
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <ClassesToolbar
              search={search}
              onSearchChange={handleSearchChange}
              sortValue={sortParam}
              onSortChange={handleSortChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={CLASS_COLUMN_IDS}
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={handleDateRangeChange}
              instructor={instructorFilter}
              onInstructorChange={handleInstructorChange}
              instructors={instructors}
              serviceTypeId={serviceTypeFilter}
              onServiceTypeChange={handleServiceTypeChange}
              serviceTypes={serviceTypes}
              roomId={roomFilter}
              onRoomChange={handleRoomChange}
              rooms={rooms}
              onClearFilters={handleClearFilters}
              stats={statsQuery.data}
            />
          ),
        }}
        pagination={{
          currentPage: data.pagination.currentPage,
          totalPages: data.pagination.totalPages,
          pageSize: data.pagination.pageSize,
          totalItems: data.pagination.totalItems,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
      />
    </div>
  );
}

function visibilityFromHidden(hidden: string[]): VisibilityState {
  if (!hidden?.length) return {};
  return hidden.reduce<VisibilityState>((acc, columnId) => {
    acc[columnId] = false;
    return acc;
  }, {});
}

function normalizeColumnOrder(
  order: string[],
  defaults: string[],
  fixedFirst?: string
) {
  const seen = new Set<string>();
  const next: string[] = [];
  if (fixedFirst && defaults.includes(fixedFirst)) {
    seen.add(fixedFirst);
    next.push(fixedFirst);
  }
  for (const id of order) {
    if (!defaults.includes(id)) continue;
    if (fixedFirst && id === fixedFirst) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  for (const id of defaults) {
    if (fixedFirst && id === fixedFirst) continue;
    if (!seen.has(id)) {
      seen.add(id);
      next.push(id);
    }
  }
  return next;
}

function shallowEqualArrays(a: string[] | null, b: string[] | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function"
    ? (updater as (input: T) => T)(previous)
    : updater;
}
