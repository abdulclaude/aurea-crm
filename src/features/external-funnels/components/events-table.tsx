"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  Updater,
  VisibilityState,
  SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Activity, Eye, DollarSign } from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import { EventsToolbar } from "./events-toolbar";
import { generateUserName } from "../lib/generate-user-name";
import { EventsChart } from "./events-chart";

type EventRow = {
  id: string;
  eventId: string;
  eventName: string;
  pagePath: string | null;
  pageTitle: string | null;
  userId: string | null;
  anonymousId: string | null;
  deviceType: string | null;
  browserName: string | null;
  isConversion: boolean;
  revenue: any;
  timestamp: Date;
  // Category fields
  eventCategory: string | null;
  eventDescription: string | null;
  eventColor?: string | null;
  microConversionValue: number | null;
  isMicroConversion: boolean;
  // Grouping fields
  isGrouped?: boolean;
  groupCount?: number;
  groupedEvents?: EventRow[];
};

const SORTABLE_COLUMNS = new Set([
  "eventName",
  "timestamp",
  "category",
  "value",
]);

const sortValueToState = (value?: string): SortingState => {
  const sort = value || "timestamp.desc";
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

// Cache for user names - persisted in localStorage
const USER_NAMES_CACHE_KEY = "aurea_user_display_names";

const getUserNamesCache = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  try {
    const cached = localStorage.getItem(USER_NAMES_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

const saveUserNamesCache = (cache: Record<string, string>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_NAMES_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to save user names cache:", error);
  }
};

const getUserDisplayName = (
  userId: string | null,
  anonymousId: string | null
): string => {
  const identifier = userId || anonymousId;

  if (!identifier) {
    return "Anonymous";
  }

  const cache = getUserNamesCache();

  // Return cached name if exists
  if (cache[identifier]) {
    return cache[identifier];
  }

  // Generate and cache new name
  const generatedName = generateUserName();
  cache[identifier] = generatedName;
  saveUserNamesCache(cache);

  return generatedName;
};

const getCategoryColor = (
  category: string | null,
  isConversion: boolean,
  customColor: string | null
): string => {
  // If custom color is provided (either short name or full Tailwind classes)
  if (customColor) {
    // Check if it's a full Tailwind class string (contains spaces)
    if (customColor.includes(" ")) {
      return customColor; // Use as-is (e.g., "bg-pink-100 text-pink-800 border-pink-200")
    }

    // Otherwise, it's a color name - generate Tailwind classes
    return `bg-${customColor}-100 text-${customColor}-800 border-${customColor}-200 dark:bg-${customColor}-900/20 dark:text-${customColor}-400 dark:border-${customColor}-800/30`;
  }

  // Default conversion color
  if (isConversion)
    return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30";

  // Default category colors
  switch (category) {
    case "viewing":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30";
    case "engagement":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30";
    case "high_engagement":
      return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 dark:border-fuchsia-800/30";
    case "intent":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30";
    case "conversion":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30";
    case "session":
      return "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800/30";
    case "performance":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30";
    case "custom":
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800/30";
    default:
      return "bg-primary/5 text-primary/80 border-primary/10";
  }
};

const createEventColumns = (
  getDisplayName: (userId: string | null, anonymousId: string | null) => string
): ColumnDef<EventRow>[] => [
  {
    id: "event",
    accessorKey: "eventName",
    header: "Event",
    meta: { label: "Event" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span
              className={`text-[11px] w-fit text-xs font-semibold px-2 py-1 rounded border ${getCategoryColor(
                row.original.eventCategory,
                row.original.isConversion,
                row.original.eventColor || null
              )}`}
            >
              {row.original.isConversion
                ? "conversion"
                : row.original.eventName}
            </span>
            {row.original.isGrouped &&
              row.original.groupCount &&
              row.original.groupCount > 1 && (
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded border ${getCategoryColor(
                    row.original.eventCategory,
                    row.original.isConversion,
                    row.original.eventColor || null
                  )}`}
                >
                  ×{row.original.groupCount}
                </span>
              )}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "category",
    accessorKey: "eventCategory",
    header: "Category",
    meta: { label: "Category" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary capitalize">
        {row.original.eventCategory || "—"}
      </span>
    ),
  },
  {
    id: "description",
    accessorKey: "eventDescription",
    header: "Description",
    meta: { label: "Description" },
    cell: ({ row }) => (
      <span className="text-xs text-primary/75 max-w-[300px] truncate block">
        {row.original.eventDescription || "—"}
      </span>
    ),
  },
  {
    id: "value",
    accessorKey: "microConversionValue",
    header: "Value",
    meta: { label: "Value" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {row.original.microConversionValue !== null &&
        row.original.microConversionValue !== undefined
          ? `${row.original.microConversionValue}/100`
          : "—"}
      </span>
    ),
  },
  {
    id: "page",
    header: "Page",
    meta: { label: "Page" },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-xs text-primary">
          {row.original.pagePath || "—"}
        </span>
        {row.original.pageTitle && (
          <span className="text-[11px] text-primary/75 truncate max-w-[200px]">
            {row.original.pageTitle}
          </span>
        )}
      </div>
    ),
  },
  {
    id: "user",
    header: "User",
    meta: { label: "User" },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-xs text-primary font-medium">
          {getDisplayName(row.original.userId, row.original.anonymousId)}
        </span>
        {row.original.isGrouped &&
          row.original.groupCount &&
          row.original.groupCount > 1 && (
            <span className="text-[11px] text-primary/60">
              {row.original.groupCount} events
            </span>
          )}
      </div>
    ),
  },
  {
    id: "device",
    header: "Device",
    meta: { label: "Device" },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-xs text-primary capitalize">
          {row.original.deviceType || "Unknown"}
        </span>
        {row.original.browserName && (
          <span className="text-[11px] text-primary/75">
            {row.original.browserName}
          </span>
        )}
      </div>
    ),
  },
  {
    id: "timestamp",
    accessorKey: "timestamp",
    header: "Time",
    meta: { label: "Time" },
    enableSorting: true,
    cell: ({ row }) => {
      if (
        row.original.isGrouped &&
        row.original.groupedEvents &&
        row.original.groupedEvents.length > 1
      ) {
        const firstEvent = row.original.groupedEvents[0];
        const lastEvent =
          row.original.groupedEvents[row.original.groupedEvents.length - 1];
        return (
          <div className="flex flex-col">
            <span className="text-xs text-primary">
              {format(new Date(firstEvent.timestamp), "MMM d, yy 'at' HH:mm")}
            </span>
            <span className="text-[11px] text-primary/60">
              to {format(new Date(lastEvent.timestamp), "HH:mm")}
            </span>
          </div>
        );
      }
      return (
        <span className="text-xs text-primary">
          {format(new Date(row.original.timestamp), "MMM d, yy 'at' HH:mm")}
        </span>
      );
    },
  },
];

// Use default function for getting column IDs (before component initialization)
const EVENT_COLUMN_IDS = createEventColumns(getUserDisplayName).map(
  (column, index) => (column.id ?? `column-${index}`) as string
);

const PRIMARY_COLUMN_ID = "event";
const COLUMN_ORDER_STORAGE_KEY = "events-table.column-order";

type EventsTableProps = {
  funnelId: string;
};

export function EventsTable({ funnelId }: EventsTableProps) {
  const trpc = useTRPC();

  // URL state management
  const [searchValue, setSearchValue] = useQueryState(
    "eventsSearch",
    parseAsString.withDefault("")
  );
  const [view, setView] = useQueryState(
    "eventsView",
    parseAsString.withDefault("chart")
  );
  const [page, setPage] = useQueryState(
    "eventsPage",
    parseAsInteger.withDefault(1)
  );
  const [pageSize, setPageSize] = useQueryState(
    "eventsPageSize",
    parseAsInteger.withDefault(20)
  );

  const handleViewChange = React.useCallback(
    (newView: "chart" | "table") => {
      setView(newView);
    },
    [setView]
  );
  const [sortValue, setSortValue] = useQueryState(
    "eventsSort",
    parseAsString.withDefault("timestamp.desc")
  );
  const [selectedEventTypes, setSelectedEventTypes] = useQueryState(
    "eventTypes",
    parseAsString.withDefault("")
  );
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useQueryState(
    "deviceTypes",
    parseAsString.withDefault("")
  );
  const [selectedUsers, setSelectedUsers] = useQueryState(
    "users",
    parseAsString.withDefault("")
  );
  const [showConversionsOnly, setShowConversionsOnly] = useQueryState(
    "conversionsOnly",
    parseAsString.withDefault("")
  );
  const [timestampStartStr, setTimestampStartStr] = useQueryState(
    "timestampStart",
    parseAsString.withDefault("")
  );
  const [timestampEndStr, setTimestampEndStr] = useQueryState(
    "timestampEnd",
    parseAsString.withDefault("")
  );
  const [hiddenColumns, setHiddenColumns] = useQueryState(
    "hiddenColumns",
    parseAsString.withDefault("")
  );

  // Convert strings to arrays/dates
  const eventTypes = selectedEventTypes
    ? selectedEventTypes.split(",").filter(Boolean)
    : [];
  const deviceTypes = selectedDeviceTypes
    ? selectedDeviceTypes.split(",").filter(Boolean)
    : [];
  const users = selectedUsers ? selectedUsers.split(",").filter(Boolean) : [];
  const conversionsOnly = showConversionsOnly === "true";
  const timestampStart = timestampStartStr
    ? new Date(timestampStartStr)
    : undefined;
  const timestampEnd = timestampEndStr ? new Date(timestampEndStr) : undefined;

  const { data, isLoading } = useQuery({
    ...trpc.externalFunnels.getEvents.queryOptions({
      funnelId,
      limit: 100, // Fetch max events for client-side filtering/pagination
    }),
    refetchInterval: 3000, // Poll every 3 seconds for fresh data
    staleTime: 0, // Always consider data stale to enable refetching
    placeholderData: (previousData) => previousData, // Keep previous data while fetching (prevents skeleton flicker)
  });

  // Extract unique anonymous IDs from events
  const uniqueAnonymousIds = React.useMemo(() => {
    const ids = new Set<string>();
    (data?.events || []).forEach((event: any) => {
      if (event.anonymousId) {
        ids.add(event.anonymousId);
      }
    });
    return Array.from(ids);
  }, [data?.events]);

  // Fetch user profiles for all anonymous IDs
  const { data: userProfilesData } = useQuery({
    ...trpc.externalFunnels.getUserProfiles.queryOptions({
      funnelId,
      anonymousIds: uniqueAnonymousIds,
    }),
    refetchInterval: 5000, // Poll every 5 seconds for user profile updates
    staleTime: 0, // Always consider data stale
    placeholderData: (previousData) => previousData, // Keep previous data while fetching (prevents skeleton flicker)
  });

  // Filter and sort data client-side (for now)
  const filteredData = React.useMemo(() => {
    let result = data?.events || [];

    // Search filter
    if (searchValue) {
      result = result.filter(
        (event: any) =>
          event.eventName.toLowerCase().includes(searchValue.toLowerCase()) ||
          event.pagePath?.toLowerCase().includes(searchValue.toLowerCase()) ||
          event.userId?.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    // Event type filter
    if (eventTypes.length > 0) {
      result = result.filter((event: any) =>
        eventTypes.includes(event.eventName)
      );
    }

    // Device type filter
    if (deviceTypes.length > 0) {
      result = result.filter((event: any) =>
        deviceTypes.includes(event.deviceType || "Unknown")
      );
    }

    // User filter
    if (users.length > 0) {
      result = result.filter((event: any) => {
        const identifier = event.userId || event.anonymousId;
        return users.includes(identifier);
      });
    }

    // Conversions only filter
    if (conversionsOnly) {
      result = result.filter((event: any) => event.isConversion);
    }

    // Timestamp filter
    if (timestampStart) {
      result = result.filter(
        (event: any) => new Date(event.timestamp) >= timestampStart
      );
    }
    if (timestampEnd) {
      result = result.filter(
        (event: any) => new Date(event.timestamp) <= timestampEnd
      );
    }

    // Sorting
    const [sortColumn, sortDirection] = sortValue.split(".");
    if (sortColumn && sortDirection) {
      result = [...result].sort((a: any, b: any) => {
        // Map column IDs to actual field names
        const fieldMap: Record<string, string> = {
          eventName: "eventName",
          timestamp: "timestamp",
          category: "eventCategory",
          value: "microConversionValue",
        };
        const field = fieldMap[sortColumn] || sortColumn;
        const aVal = a[field];
        const bVal = b[field];

        // Handle timestamp sorting
        if (field === "timestamp") {
          const aTime = new Date(aVal).getTime();
          const bTime = new Date(bVal).getTime();
          return sortDirection === "desc" ? bTime - aTime : aTime - bTime;
        }

        // Handle numeric sorting (value)
        if (field === "microConversionValue") {
          const aNum = aVal ?? -1;
          const bNum = bVal ?? -1;
          return sortDirection === "desc" ? bNum - aNum : aNum - bNum;
        }

        // Handle string sorting (category, eventName)
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "desc"
            ? bVal.localeCompare(aVal)
            : aVal.localeCompare(bVal);
        }

        // Handle null values
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return sortDirection === "desc" ? 1 : -1;
        if (bVal === null) return sortDirection === "desc" ? -1 : 1;

        return 0;
      });
    }

    // Group consecutive events by user and event type
    const grouped: EventRow[] = [];
    for (let i = 0; i < result.length; i++) {
      const current = result[i];
      const currentUser = current.userId || current.anonymousId;

      // Check if we can group with the last grouped item
      const lastGrouped = grouped[grouped.length - 1];

      if (
        lastGrouped &&
        lastGrouped.eventName === current.eventName &&
        (lastGrouped.userId || lastGrouped.anonymousId) === currentUser &&
        !lastGrouped.isConversion && // Don't group conversions
        !current.isConversion
      ) {
        // Add to existing group
        lastGrouped.groupCount = (lastGrouped.groupCount || 1) + 1;
        lastGrouped.isGrouped = true;
        if (!lastGrouped.groupedEvents) {
          lastGrouped.groupedEvents = [lastGrouped];
        }
        lastGrouped.groupedEvents.push(current);
      } else {
        // Start new group or add standalone event
        grouped.push({ ...current });
      }
    }

    return grouped;
  }, [
    data?.events,
    searchValue,
    eventTypes,
    deviceTypes,
    users,
    conversionsOnly,
    timestampStart,
    timestampEnd,
    sortValue,
  ]);

  // Get unique event types and device types for filters
  const uniqueEventTypes = React.useMemo(() => {
    const types = new Set<string>();
    (data?.events || []).forEach((event: any) => {
      types.add(event.eventName);
    });
    return Array.from(types);
  }, [data?.events]);

  const uniqueDeviceTypes = React.useMemo(() => {
    const types = new Set<string>();
    (data?.events || []).forEach((event: any) => {
      types.add(event.deviceType || "Unknown");
    });
    return Array.from(types);
  }, [data?.events]);

  // Helper to get display name from database or fallback to generation
  const getDisplayName = React.useCallback(
    (userId: string | null, anonymousId: string | null): string => {
      if (userId) return userId; // If userId (email), use it directly
      if (!anonymousId) return "Anonymous";

      // Try to get from database first (userProfilesData is a Record<string, Profile>)
      if (userProfilesData && anonymousId in userProfilesData) {
        const profile = userProfilesData[anonymousId];
        if (profile?.displayName) return profile.displayName;
      }

      // Fallback to localStorage/generation (for backwards compatibility)
      return getUserDisplayName(userId, anonymousId);
    },
    [userProfilesData]
  );

  const uniqueUsers = React.useMemo(() => {
    const usersMap = new Map<string, string>();
    (data?.events || []).forEach((event: any) => {
      const identifier = event.userId || event.anonymousId;
      if (identifier && !usersMap.has(identifier)) {
        usersMap.set(
          identifier,
          getDisplayName(event.userId, event.anonymousId)
        );
      }
    });
    return Array.from(usersMap.entries()).map(([identifier, displayName]) => ({
      identifier,
      displayName,
    }));
  }, [data?.events, getDisplayName]);

  // Column visibility and ordering
  const hiddenColumnsArray = hiddenColumns
    ? hiddenColumns.split(",").filter(Boolean)
    : [];
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() =>
      visibilityFromHidden(hiddenColumnsArray)
    );
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(EVENT_COLUMN_IDS);

  const pendingHiddenRef = React.useRef<string[] | null>(null);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") return;
    const next = normalizeColumnOrder(
      order,
      EVENT_COLUMN_IDS,
      PRIMARY_COLUMN_ID
    );
    if (shallowEqualArrays(next, EVENT_COLUMN_IDS)) {
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
          EVENT_COLUMN_IDS,
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
      const nextValue = sortingStateToValue(state) ?? "timestamp.desc";
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

  const handleToggleEventType = React.useCallback(
    (eventType: string) => {
      const current = eventTypes;
      const next = toggleValue(current, eventType);
      void setSelectedEventTypes(next.join(","));
      void setPage(1);
    },
    [eventTypes, setSelectedEventTypes, setPage]
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

  const handleToggleUser = React.useCallback(
    (user: string) => {
      const current = users;
      const next = toggleValue(current, user);
      void setSelectedUsers(next.join(","));
      void setPage(1);
    },
    [users, setSelectedUsers, setPage]
  );

  const handleToggleConversionsOnly = React.useCallback(() => {
    void setShowConversionsOnly(conversionsOnly ? "" : "true");
    void setPage(1);
  }, [conversionsOnly, setShowConversionsOnly, setPage]);

  const handleTimestampChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setTimestampStartStr(start ? toYMD(start) : "");
      void setTimestampEndStr(end ? toYMD(end) : "");
      void setPage(1);
    },
    [setTimestampStartStr, setTimestampEndStr, setPage]
  );

  const handleClearFilters = React.useCallback(() => {
    void setSelectedEventTypes("");
    void setSelectedDeviceTypes("");
    void setSelectedUsers("");
    void setShowConversionsOnly("");
    void setTimestampStartStr("");
    void setTimestampEndStr("");
    void setPage(1);
  }, [
    setSelectedEventTypes,
    setSelectedDeviceTypes,
    setSelectedUsers,
    setShowConversionsOnly,
    setTimestampStartStr,
    setTimestampEndStr,
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
          EVENT_COLUMN_IDS,
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

  // Create columns with the display name function
  const eventColumns = React.useMemo(
    () => createEventColumns(getDisplayName),
    [getDisplayName]
  );

  // Client-side pagination - slice the filtered data
  const paginatedData = React.useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, page, pageSize]);

  // If chart view, render chart component instead (after all hooks)
  if (view === "chart") {
    return <EventsChart funnelId={funnelId} />;
  }

  return (
    <div className="">
      <DataTable
        data={paginatedData}
        columns={eventColumns}
        isLoading={isLoading}
        getRowId={(row: any) => row.id}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={EVENT_COLUMN_IDS}
        initialSorting={[{ id: "timestamp", desc: true }]}
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
            No events tracked yet. <br /> Events will appear here once your SDK
            starts tracking.
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <EventsToolbar
              search={searchValue}
              onSearchChange={handleSearchChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={EVENT_COLUMN_IDS}
              view={view as "chart" | "table"}
              onViewChange={handleViewChange}
              eventTypes={uniqueEventTypes}
              selectedEventTypes={eventTypes}
              onToggleEventType={handleToggleEventType}
              deviceTypes={uniqueDeviceTypes}
              selectedDeviceTypes={deviceTypes}
              onToggleDeviceType={handleToggleDeviceType}
              users={uniqueUsers}
              selectedUsers={users}
              onToggleUser={handleToggleUser}
              showConversionsOnly={conversionsOnly}
              onToggleConversionsOnly={handleToggleConversionsOnly}
              timestampStart={timestampStart}
              timestampEnd={timestampEnd}
              onTimestampChange={handleTimestampChange}
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
