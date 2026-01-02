"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { Gauge, TrendingUp, TrendingDown, Minus } from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString, parseAsArrayOf } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { useTRPC } from "@/trpc/client";
import { WebVitalsToolbar } from "./web-vitals-toolbar";
import { cn } from "@/lib/utils";

type WebVitalRow = {
  id: string;
  metric: string;
  value: number;
  rating: string;
  pageUrl: string | null;
  pagePath: string | null;
  pageTitle: string | null;
  deviceType: string | null;
  browserName: string | null;
  countryName: string | null;
  timestamp: Date;
};

const SORTABLE_COLUMNS = new Set(["metric", "value", "timestamp", "rating"]);

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

const getRatingColor = (rating: string) => {
  switch (rating) {
    case "GOOD":
      return "text-green-600 dark:text-green-400";
    case "NEEDS_IMPROVEMENT":
      return "text-yellow-600 dark:text-yellow-400";
    case "POOR":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-primary";
  }
};

const getRatingBadgeColor = (rating: string) => {
  switch (rating) {
    case "GOOD":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30";
    case "NEEDS_IMPROVEMENT":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30";
    case "POOR":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800/30";
  }
};

const getRatingIcon = (rating: string) => {
  switch (rating) {
    case "GOOD":
      return <TrendingUp className="h-3 w-3" />;
    case "NEEDS_IMPROVEMENT":
      return <Minus className="h-3 w-3" />;
    case "POOR":
      return <TrendingDown className="h-3 w-3" />;
    default:
      return <Gauge className="h-3 w-3" />;
  }
};

const formatValue = (metric: string, value: number): string => {
  if (metric === "CLS") {
    return value.toFixed(3);
  }
  // Time-based metrics (ms to seconds)
  return `${(value / 1000).toFixed(2)}s`;
};

const getMetricDescription = (metric: string): string => {
  switch (metric) {
    case "LCP":
      return "Largest Contentful Paint";
    case "INP":
      return "Interaction to Next Paint";
    case "CLS":
      return "Cumulative Layout Shift";
    case "FCP":
      return "First Contentful Paint";
    case "TTFB":
      return "Time to First Byte";
    case "FID":
      return "First Input Delay";
    default:
      return metric;
  }
};

const createWebVitalsColumns = (): ColumnDef<WebVitalRow>[] => [
  {
    id: "metric",
    accessorKey: "metric",
    header: "Metric",
    meta: { label: "Metric" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-primary">{row.original.metric}</span>
        <span className="text-[11px] text-primary/75">
          {getMetricDescription(row.original.metric)}
        </span>
      </div>
    ),
  },
  {
    id: "value",
    accessorKey: "value",
    header: "Value",
    meta: { label: "Value" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className={cn("text-xs font-semibold", getRatingColor(row.original.rating))}>
        {formatValue(row.original.metric, row.original.value)}
      </span>
    ),
  },
  {
    id: "rating",
    accessorKey: "rating",
    header: "Rating",
    meta: { label: "Rating" },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "text-[11px] font-semibold px-2 py-1 rounded border flex items-center gap-1",
            getRatingBadgeColor(row.original.rating)
          )}
        >
          {getRatingIcon(row.original.rating)}
          {row.original.rating === "NEEDS_IMPROVEMENT" ? "Needs Improvement" : row.original.rating.toLowerCase()}
        </span>
      </div>
    ),
  },
  {
    id: "page",
    header: "Page",
    meta: { label: "Page" },
    cell: ({ row }) => (
      <div className="flex flex-col max-w-[300px]">
        <span className="text-xs text-primary truncate">
          {row.original.pagePath || row.original.pageUrl || "—"}
        </span>
        {row.original.pageTitle && (
          <span className="text-[11px] text-primary/75 truncate">
            {row.original.pageTitle}
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
          <span className="text-[11px] text-primary/75">{row.original.browserName}</span>
        )}
      </div>
    ),
  },
  {
    id: "location",
    header: "Location",
    meta: { label: "Location" },
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {row.original.countryName || "—"}
      </span>
    ),
  },
  {
    id: "timestamp",
    accessorKey: "timestamp",
    header: "Timestamp",
    meta: { label: "Timestamp" },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-xs text-primary">
          {format(new Date(row.original.timestamp), "MMM d, yyyy")}
        </span>
        <span className="text-[11px] text-primary/75">
          {format(new Date(row.original.timestamp), "h:mm a")}
        </span>
      </div>
    ),
  },
];

interface WebVitalsTableProps {
  funnelId: string;
}

export function WebVitalsTable({ funnelId }: WebVitalsTableProps) {
  const trpc = useTRPC();

  // Query states
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [selectedMetrics, setSelectedMetrics] = useQueryState(
    "metrics",
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [selectedRatings, setSelectedRatings] = useQueryState(
    "ratings",
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useQueryState(
    "deviceTypes",
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [sortValue, setSortValue] = useQueryState("sort", parseAsString.withDefault("timestamp.desc"));

  // Filters data
  const { data: filtersData } = useQuery({
    ...trpc.webVitals.getWebVitalsFilters.queryOptions({
      funnelId,
    }),
    refetchInterval: 10000, // Poll every 10 seconds for filter updates
    staleTime: 0,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching (prevents skeleton flicker)
  });

  // Web vitals data
  const [allWebVitals, setAllWebVitals] = React.useState<WebVitalRow[]>([]);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = React.useState(true);

  const { data: webVitalsData, isFetching } = useQuery({
    ...trpc.webVitals.getWebVitals.queryOptions({
      funnelId,
      metric: selectedMetrics.length > 0 ? (selectedMetrics[0] as any) : undefined,
      rating: selectedRatings.length > 0 ? (selectedRatings[0] as any) : undefined,
      pageUrl: search || undefined,
      deviceType: selectedDeviceTypes.length > 0 ? selectedDeviceTypes[0] : undefined,
      cursor,
      limit: 50,
    }),
    refetchInterval: 5000, // Poll every 5 seconds for new web vitals
    staleTime: 0,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching (prevents skeleton flicker)
  });

  React.useEffect(() => {
    if (webVitalsData) {
      if (cursor) {
        // Append to existing data
        setAllWebVitals((prev) => [...prev, ...webVitalsData.webVitals]);
      } else {
        // Replace data (new query)
        setAllWebVitals(webVitalsData.webVitals);
      }
      setHasMore(!!webVitalsData.nextCursor);
    }
  }, [webVitalsData, cursor]);

  // Reset when filters change
  React.useEffect(() => {
    setCursor(undefined);
    setAllWebVitals([]);
  }, [funnelId, selectedMetrics, selectedRatings, search, selectedDeviceTypes, sortValue]);

  const loadMore = () => {
    if (webVitalsData?.nextCursor && !isFetching) {
      setCursor(webVitalsData.nextCursor);
    }
  };

  const handleToggleMetric = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  const handleToggleRating = (rating: string) => {
    setSelectedRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    );
  };

  const handleToggleDeviceType = (deviceType: string) => {
    setSelectedDeviceTypes((prev) =>
      prev.includes(deviceType) ? prev.filter((d) => d !== deviceType) : [...prev, deviceType]
    );
  };

  const handleClearFilters = () => {
    void setSearch("");
    void setSelectedMetrics([]);
    void setSelectedRatings([]);
    void setSelectedDeviceTypes([]);
    void setSortValue("timestamp.desc");
  };

  const handleSortChange = (value: string) => {
    void setSortValue(value);
  };

  const handleSortingChange = React.useCallback(
    (newSorting: SortingState) => {
      const newValue = sortingStateToValue(newSorting);
      if (newValue) {
        void setSortValue(newValue);
      }
    },
    [setSortValue]
  );

  const columns = React.useMemo(() => createWebVitalsColumns(), []);

  const sorting = sortValueToState(sortValue);

  return (
    <div className="space-y-4">
      <WebVitalsToolbar
        search={search}
        onSearchChange={setSearch}
        metrics={["LCP", "INP", "CLS", "FCP", "TTFB", "FID"]}
        selectedMetrics={selectedMetrics}
        onToggleMetric={handleToggleMetric}
        ratings={["GOOD", "NEEDS_IMPROVEMENT", "POOR"]}
        selectedRatings={selectedRatings}
        onToggleRating={handleToggleRating}
        deviceTypes={filtersData?.devices || []}
        selectedDeviceTypes={selectedDeviceTypes}
        onToggleDeviceType={handleToggleDeviceType}
        sortValue={sortValue}
        onSortChange={handleSortChange}
        onClearFilters={handleClearFilters}
      />

      <DataTable
        columns={columns}
        data={allWebVitals}
        sorting={sorting}
        onSortingChange={handleSortingChange}
      />

      {hasMore && !isFetching && (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={loadMore}
            className="text-xs text-primary hover:text-black dark:hover:text-white transition px-4 py-2 rounded-lg border border-black/10 dark:border-white/5 hover:bg-primary-foreground/50"
          >
            Load more
          </button>
        </div>
      )}

      {isFetching && (
        <div className="flex justify-center py-4">
          <span className="text-xs text-primary/60">Loading...</span>
        </div>
      )}
    </div>
  );
}
