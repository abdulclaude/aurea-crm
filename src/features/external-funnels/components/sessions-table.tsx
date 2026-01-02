"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  Updater,
  VisibilityState,
  SortingState,
} from "@tanstack/react-table";
import { format, formatDistanceStrict } from "date-fns";
import { Globe, CheckCircle, XCircle, Clock } from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { GradientAvatar } from "@/components/ui/gradient-avatar";
import { useTRPC } from "@/trpc/client";
import { SessionsToolbar } from "./sessions-toolbar";
import { SessionsChart } from "./sessions-chart";

type SessionRow = {
  id: string;
  sessionId: string;
  userId: string | null;
  anonymousId: string | null;
  visitorDisplayName?: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  firstPageUrl: string | null;
  lastPageUrl: string | null;
  pageViews: number;
  eventsCount: number;
  converted: boolean;
  conversionValue: any;
  deviceType: string | null;
  firstSource: string | null;
  firstMedium: string | null;
  countryCode: string | null;
  city: string | null;
};

const SORTABLE_COLUMNS = new Set([
  "startedAt",
  "pageViews",
  "eventsCount",
  "durationSeconds",
]);

const sortValueToState = (value?: string): SortingState => {
  const sort = value || "startedAt.desc";
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

const toggleValue = (values: string[], value: string) => {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds === 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

const sessionColumns: ColumnDef<SessionRow>[] = [
  {
    id: "session",
    header: "Session",
    meta: { label: "Session" },
    enableHiding: false,
    cell: ({ row }) => {
      // Use visitor display name from profile, fallback to IDs
      const visitorName =
        row.original.visitorDisplayName ||
        row.original.userId ||
        row.original.anonymousId ||
        "Anonymous Visitor";
      const seed = row.original.anonymousId || row.original.sessionId;

      return (
        <div className="flex items-center gap-2.5">
          <GradientAvatar seed={seed} name={visitorName} size={32} />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-primary">
              {visitorName.length > 20
                ? `${visitorName.substring(0, 20)}...`
                : visitorName}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    id: "pages",
    header: "Landing → Exit",
    meta: { label: "Pages" },
    cell: ({ row }) => {
      const landing = row.original.firstPageUrl;
      const exit = row.original.lastPageUrl;

      const getLandingPath = () => {
        if (!landing) return "Unknown";
        try {
          return new URL(landing).pathname || "/";
        } catch {
          return landing;
        }
      };

      const getExitPath = () => {
        if (!exit) return "—";
        try {
          return new URL(exit).pathname || "/";
        } catch {
          return exit;
        }
      };

      return (
        <div className="flex flex-col">
          <span className="text-xs text-primary truncate max-w-[200px]">
            {getLandingPath()}
          </span>
          {exit && landing !== exit && (
            <span className="text-[11px] text-primary/75 truncate max-w-[200px]">
              → {getExitPath()}
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "activity",
    header: "Activity",
    meta: { label: "Activity" },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-xs text-primary">
          {row.original.pageViews} page views
        </span>
        <span className="text-[11px] text-primary/75">
          {row.original.eventsCount} events
        </span>
      </div>
    ),
  },
  {
    id: "duration",
    accessorKey: "durationSeconds",
    header: "Duration",
    meta: { label: "Duration" },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <Clock className="size-3.5 text-primary/50" />
        <span className="text-xs text-primary">
          {formatDuration(row.original.durationSeconds)}
        </span>
      </div>
    ),
  },
  {
    id: "device",
    header: "Device",
    meta: { label: "Device" },
    cell: ({ row }) => (
      <span className="text-xs text-primary capitalize">
        {row.original.deviceType || "Unknown"}
      </span>
    ),
  },
  {
    id: "source",
    header: "Source",
    meta: { label: "Source" },
    cell: ({ row }) => {
      const source = row.original.firstSource;
      const medium = row.original.firstMedium;

      if (!source && !medium) {
        return <span className="text-xs text-primary/75">Direct</span>;
      }

      return (
        <div className="flex flex-col">
          <span className="text-xs text-primary">{source || "Unknown"}</span>
          {medium && (
            <span className="text-[11px] text-primary/75">{medium}</span>
          )}
        </div>
      );
    },
  },
  {
    id: "location",
    header: "Location",
    meta: { label: "Location" },
    cell: ({ row }) => {
      const country = row.original.countryCode;
      const city = row.original.city;

      if (!country && !city) {
        return <span className="text-xs text-primary/75">—</span>;
      }

      return (
        <div className="flex items-center gap-1.5">
          <Globe className="size-3.5 text-primary/50" />
          <div className="flex flex-col">
            <span className="text-xs text-primary">
              {city || country || "Unknown"}
            </span>
            {city && country && (
              <span className="text-[11px] text-primary/75">{country}</span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "converted",
    header: "Converted",
    meta: { label: "Converted" },
    cell: ({ row }) => {
      const converted = row.original.converted;
      const value = row.original.conversionValue;

      return (
        <div className="flex items-center gap-2">
          {converted ? (
            <>
              <CheckCircle className="size-3.5 text-green-600" />
              <div className="flex flex-col">
                <Badge
                  variant="default"
                  className="text-[11px] w-fit bg-green-600"
                >
                  Converted
                </Badge>
                {value && (
                  <span className="text-[11px] text-primary/75 mt-1">
                    ${Number(value).toFixed(2)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <XCircle className="size-3.5 text-primary/30" />
              <Badge variant="outline" className="text-[11px] w-fit">
                Not converted
              </Badge>
            </>
          )}
        </div>
      );
    },
  },
  {
    id: "startedAt",
    accessorKey: "startedAt",
    header: "Started",
    meta: { label: "Started" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {format(new Date(row.original.startedAt), "MMM d, yy 'at' HH:mm")}
      </span>
    ),
  },
];

const SESSION_COLUMN_IDS = sessionColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string
);

const PRIMARY_COLUMN_ID = "session";
const COLUMN_ORDER_STORAGE_KEY = "sessions-table.column-order";

type SessionsTableProps = {
  funnelId: string;
};

export function SessionsTable({ funnelId }: SessionsTableProps) {
  const trpc = useTRPC();

  // URL state management
  const [view, setView] = useQueryState(
    "sessionsView",
    parseAsString.withDefault("chart")
  );
  const [searchValue, setSearchValue] = useQueryState(
    "sessionsSearch",
    parseAsString.withDefault("")
  );
  const [page, setPage] = useQueryState(
    "sessionsPage",
    parseAsInteger.withDefault(1)
  );

  const handleViewChange = React.useCallback(
    (newView: "chart" | "table") => {
      setView(newView);
    },
    [setView]
  );
  const [pageSize, setPageSize] = useQueryState(
    "sessionsPageSize",
    parseAsInteger.withDefault(20)
  );
  const [sortValue, setSortValue] = useQueryState(
    "sessionsSort",
    parseAsString.withDefault("startedAt.desc")
  );
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useQueryState(
    "sessionDeviceTypes",
    parseAsString.withDefault("")
  );
  const [convertedFilter, setConvertedFilter] = useQueryState(
    "sessionConverted",
    parseAsString.withDefault("")
  );
  const [startedAtStartStr, setStartedAtStartStr] = useQueryState(
    "sessionStartedStart",
    parseAsString.withDefault("")
  );
  const [startedAtEndStr, setStartedAtEndStr] = useQueryState(
    "sessionStartedEnd",
    parseAsString.withDefault("")
  );
  const [hiddenColumns, setHiddenColumns] = useQueryState(
    "sessionHiddenColumns",
    parseAsString.withDefault("")
  );

  // Convert strings to arrays/dates
  const deviceTypes = selectedDeviceTypes
    ? selectedDeviceTypes.split(",").filter(Boolean)
    : [];
  const convertedOnly = convertedFilter === "true";
  const notConvertedOnly = convertedFilter === "false";
  const startedAtStart = startedAtStartStr
    ? new Date(startedAtStartStr)
    : undefined;
  const startedAtEnd = startedAtEndStr ? new Date(startedAtEndStr) : undefined;

  const { data, isLoading } = useQuery({
    ...trpc.externalFunnels.getSessions.queryOptions({
      funnelId,
      limit: 100, // Fetch max sessions for client-side filtering/pagination
    }),
    refetchInterval: 5000, // Poll every 5 seconds for fresh session data
    staleTime: 0, // Always consider data stale to enable refetching
    placeholderData: (previousData) => previousData, // Keep previous data while fetching (prevents skeleton flicker)
  });

  // Filter and sort data client-side
  const filteredData = React.useMemo(() => {
    let result = data?.sessions || [];

    // Search filter (session ID, user ID, anonymous ID)
    if (searchValue) {
      result = result.filter(
        (session: any) =>
          session.sessionId.toLowerCase().includes(searchValue.toLowerCase()) ||
          session.userId?.toLowerCase().includes(searchValue.toLowerCase()) ||
          session.anonymousId
            ?.toLowerCase()
            .includes(searchValue.toLowerCase()) ||
          session.firstPageUrl
            ?.toLowerCase()
            .includes(searchValue.toLowerCase())
      );
    }

    // Device type filter
    if (deviceTypes.length > 0) {
      result = result.filter((session: any) =>
        deviceTypes.includes(session.deviceType || "Unknown")
      );
    }

    // Converted filter
    if (convertedOnly) {
      result = result.filter((session: any) => session.converted === true);
    } else if (notConvertedOnly) {
      result = result.filter((session: any) => session.converted === false);
    }

    // Started at filter
    if (startedAtStart) {
      result = result.filter(
        (session: any) => new Date(session.startedAt) >= startedAtStart
      );
    }
    if (startedAtEnd) {
      result = result.filter(
        (session: any) => new Date(session.startedAt) <= startedAtEnd
      );
    }

    // Sorting
    const [sortColumn, sortDirection] = sortValue.split(".");
    if (sortColumn && sortDirection) {
      result = [...result].sort((a: any, b: any) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (sortColumn === "startedAt") {
          const aTime = new Date(aVal).getTime();
          const bTime = new Date(bVal).getTime();
          return sortDirection === "desc" ? bTime - aTime : aTime - bTime;
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
        }

        return 0;
      });
    }

    return result;
  }, [
    data?.sessions,
    searchValue,
    deviceTypes,
    convertedOnly,
    notConvertedOnly,
    startedAtStart,
    startedAtEnd,
    sortValue,
  ]);

  // Get unique device types for filters
  const uniqueDeviceTypes = React.useMemo(() => {
    const types = new Set<string>();
    (data?.sessions || []).forEach((session: any) => {
      types.add(session.deviceType || "Unknown");
    });
    return Array.from(types);
  }, [data?.sessions]);

  // Column visibility and ordering
  const hiddenColumnsArray = hiddenColumns
    ? hiddenColumns.split(",").filter(Boolean)
    : [];
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() =>
      visibilityFromHidden(hiddenColumnsArray)
    );
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(SESSION_COLUMN_IDS);

  const pendingHiddenRef = React.useRef<string[] | null>(null);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") return;
    const next = normalizeColumnOrder(
      order,
      SESSION_COLUMN_IDS,
      PRIMARY_COLUMN_ID
    );
    if (shallowEqualArrays(next, SESSION_COLUMN_IDS)) {
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
          SESSION_COLUMN_IDS,
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
      shallowEqualArrays(pendingHiddenRef.current, hiddenColumnsArray)
    ) {
      pendingHiddenRef.current = null;
      return;
    }
    setColumnVisibility(visibilityFromHidden(hiddenColumnsArray));
  }, [hiddenColumnsArray]);

  // Handlers
  const handleSearchChange = React.useCallback(
    (value: string) => {
      void setSearchValue(value);
      void setPage(1);
    },
    [setSearchValue, setPage]
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      void setSortValue(value);
    },
    [setSortValue]
  );

  const handleSortingChange = React.useCallback(
    (state: SortingState) => {
      const nextValue = sortingStateToValue(state) ?? "startedAt.desc";
      void setSortValue(nextValue);
    },
    [setSortValue]
  );

  const handlePageChange = React.useCallback(
    (newPage: number) => void setPage(newPage),
    [setPage]
  );

  const handlePageSizeChange = React.useCallback(
    (newPageSize: number) => {
      void setPageSize(newPageSize);
      void setPage(1);
    },
    [setPageSize, setPage]
  );

  const handleToggleDeviceType = React.useCallback(
    (deviceType: string) => {
      const current = deviceTypes;
      const next = toggleValue(current, deviceType);
      void setSelectedDeviceTypes(next.join(","));
      void setPage(1);
    },
    [deviceTypes, setSelectedDeviceTypes, setPage]
  );

  const handleConvertedFilterChange = React.useCallback(
    (value: string) => {
      void setConvertedFilter(value);
      void setPage(1);
    },
    [setConvertedFilter, setPage]
  );

  const handleStartedAtChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setStartedAtStartStr(start ? toYMD(start) : "");
      void setStartedAtEndStr(end ? toYMD(end) : "");
      void setPage(1);
    },
    [setStartedAtStartStr, setStartedAtEndStr, setPage]
  );

  const handleClearFilters = React.useCallback(() => {
    void setSelectedDeviceTypes("");
    void setConvertedFilter("");
    void setStartedAtStartStr("");
    void setStartedAtEndStr("");
    void setPage(1);
  }, [
    setSelectedDeviceTypes,
    setConvertedFilter,
    setStartedAtStartStr,
    setStartedAtEndStr,
    setPage,
  ]);

  const handleColumnVisibilityChange = React.useCallback(
    (state: VisibilityState) => {
      const nextState = { ...state };
      setColumnVisibility(nextState);
      const nextHidden = Object.entries(nextState)
        .filter(([, visible]) => visible === false)
        .map(([id]) => id);
      const normalizedHidden = normalizeHiddenColumns(nextHidden);
      pendingHiddenRef.current = normalizedHidden;
      void setHiddenColumns(normalizedHidden.join(","));
    },
    [setHiddenColumns]
  );

  const handleColumnOrderChange = React.useCallback(
    (updater: Updater<ColumnOrderState>) => {
      setColumnOrder((previous) => {
        const resolved = resolveUpdater(updater, previous);
        const next = normalizeColumnOrder(
          resolved,
          SESSION_COLUMN_IDS,
          PRIMARY_COLUMN_ID
        );
        persistColumnOrder(next);
        return next;
      });
    },
    [persistColumnOrder]
  );

  const sortingState = React.useMemo(
    () => sortValueToState(sortValue),
    [sortValue]
  );

  // Client-side pagination - slice the filtered data
  const paginatedData = React.useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, page, pageSize]);

  // If chart view, render chart component instead (after all hooks)
  if (view === "chart") {
    return <SessionsChart funnelId={funnelId} />;
  }

  return (
    <div className="">
      <DataTable
        data={paginatedData}
        columns={sessionColumns}
        isLoading={isLoading}
        getRowId={(row: any) => row.id}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={SESSION_COLUMN_IDS}
        initialSorting={[{ id: "startedAt", desc: true }]}
        pagination={{
          currentPage: page,
          totalPages: Math.ceil(filteredData.length / pageSize),
          pageSize: pageSize,
          totalItems: filteredData.length,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
            No sessions tracked yet. <br /> Sessions will appear here once users
            visit your funnel.
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <SessionsToolbar
              search={searchValue}
              onSearchChange={handleSearchChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={SESSION_COLUMN_IDS}
              view={view as "chart" | "table"}
              onViewChange={handleViewChange}
              deviceTypes={uniqueDeviceTypes}
              selectedDeviceTypes={deviceTypes}
              onToggleDeviceType={handleToggleDeviceType}
              convertedFilter={convertedFilter}
              onConvertedFilterChange={handleConvertedFilterChange}
              startedAtStart={startedAtStart}
              startedAtEnd={startedAtEnd}
              onStartedAtChange={handleStartedAtChange}
              sortValue={sortValue}
              onSortChange={handleSortChange}
              onClearFilters={handleClearFilters}
            />
          ),
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

function normalizeHiddenColumns(columns: string[]): string[] {
  return [...columns].sort();
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
