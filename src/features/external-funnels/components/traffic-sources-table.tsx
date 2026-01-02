"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartTableToggle } from "@/components/chart-table-toggle";
import { TrafficSourcesChart } from "./traffic-sources-chart";

type TrafficSourceRow = {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  revenue: number;
};

const trafficSourceColumns: ColumnDef<TrafficSourceRow>[] = [
  {
    id: "source",
    accessorKey: "source",
    header: "Source",
    meta: { label: "Source" },
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-primary">
          {row.original.source}
        </span>
      </div>
    ),
  },
  {
    id: "medium",
    accessorKey: "medium",
    header: "Medium",
    meta: { label: "Medium" },
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {row.original.medium}
      </span>
    ),
  },
  {
    id: "campaign",
    accessorKey: "campaign",
    header: "Campaign",
    meta: { label: "Campaign" },
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {row.original.campaign}
      </span>
    ),
  },
  {
    id: "sessions",
    accessorKey: "sessions",
    header: "Sessions",
    meta: { label: "Sessions" },
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono text-xs">
        {row.original.sessions.toLocaleString()}
      </Badge>
    ),
  },
  {
    id: "revenue",
    accessorKey: "revenue",
    header: "Revenue",
    meta: { label: "Revenue" },
    cell: ({ row }) => (
      <span className="text-xs font-medium text-green-600">
        {row.original.revenue > 0
          ? `$${Number(row.original.revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "—"}
      </span>
    ),
  },
];

type TrafficSourcesTableProps = {
  funnelId: string;
};

export function TrafficSourcesTable({ funnelId }: TrafficSourcesTableProps) {
  const trpc = useTRPC();
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");
  const [view, setView] = useQueryState(
    "sourcesView",
    parseAsString.withDefault("table")
  );

  const handleViewChange = React.useCallback((newView: "chart" | "table") => {
    setView(newView);
  }, [setView]);

  const { data, isFetching } = useSuspenseQuery(
    trpc.externalFunnels.getTrafficSources.queryOptions({
      funnelId,
      timeRange,
      limit: 50,
    })
  );

  const trafficSources = data?.trafficSources || [];

  // If chart view, render chart component instead (after all hooks)
  if (view === "chart") {
    return <TrafficSourcesChart funnelId={funnelId} />;
  }

  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-primary">Traffic Sources</h3>
          <Badge variant="secondary" className="text-xs">
            {trafficSources.length} sources
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <ChartTableToggle
            view={view as "chart" | "table"}
            onViewChange={handleViewChange}
          />
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d" className="text-xs">Last 7 days</SelectItem>
              <SelectItem value="30d" className="text-xs">Last 30 days</SelectItem>
              <SelectItem value="90d" className="text-xs">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        data={trafficSources}
        columns={trafficSourceColumns}
        isLoading={isFetching}
        getRowId={(row: TrafficSourceRow) => `${row.source}-${row.medium}-${row.campaign}`}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
            No traffic sources found. <br /> Data will appear once events start coming in.
          </div>
        }
      />
    </div>
  );
}
