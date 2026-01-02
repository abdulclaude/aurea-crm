"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Users, DollarSign, Target } from "lucide-react";

type UTMAnalyticRow = {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  avgPageViews: number;
  avgRevenue: number;
  costPerConversion: number;
};

const utmColumns: ColumnDef<UTMAnalyticRow>[] = [
  {
    id: "campaign",
    accessorKey: "campaign",
    header: "Campaign",
    meta: { label: "Campaign" },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-primary">
          {row.original.campaign}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {row.original.source} / {row.original.medium}
        </span>
      </div>
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
    id: "conversions",
    accessorKey: "conversions",
    header: "Conversions",
    meta: { label: "Conversions" },
    cell: ({ row }) => (
      <Badge variant="default" className="font-mono text-xs bg-green-600">
        {row.original.conversions.toLocaleString()}
      </Badge>
    ),
  },
  {
    id: "conversionRate",
    accessorKey: "conversionRate",
    header: "CVR",
    meta: { label: "Conversion Rate" },
    cell: ({ row }) => {
      const rate = row.original.conversionRate;
      return (
        <Badge
          variant={rate >= 5 ? "default" : rate >= 2 ? "secondary" : "outline"}
          className="font-mono text-xs"
        >
          {rate}%
        </Badge>
      );
    },
  },
  {
    id: "revenue",
    accessorKey: "revenue",
    header: "Revenue",
    meta: { label: "Revenue" },
    cell: ({ row }) => (
      <span className="text-xs font-medium text-green-600">
        {row.original.revenue > 0
          ? `$${row.original.revenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "—"}
      </span>
    ),
  },
  {
    id: "avgRevenue",
    accessorKey: "avgRevenue",
    header: "Avg Revenue",
    meta: { label: "Average Revenue" },
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground font-mono">
        ${row.original.avgRevenue.toFixed(2)}
      </span>
    ),
  },
  {
    id: "avgPageViews",
    accessorKey: "avgPageViews",
    header: "Avg Pages",
    meta: { label: "Average Page Views" },
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground font-mono">
        {row.original.avgPageViews.toFixed(1)}
      </span>
    ),
  },
];

type UTMAnalyticsProps = {
  funnelId: string;
};

export function UTMAnalytics({ funnelId }: UTMAnalyticsProps) {
  const trpc = useTRPC();
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");
  const [groupBy, setGroupBy] = React.useState<"source" | "medium" | "campaign" | "all">("campaign");

  const { data, isFetching } = useSuspenseQuery(
    trpc.externalFunnels.getUTMAnalytics.queryOptions({
      funnelId,
      timeRange,
      groupBy,
    })
  );

  const { analytics, totals } = data || { analytics: [], totals: null };

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">UTM Campaign Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Deep dive into your marketing campaign performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="campaign" className="text-xs">By Campaign</SelectItem>
              <SelectItem value="source" className="text-xs">By Source</SelectItem>
              <SelectItem value="medium" className="text-xs">By Medium</SelectItem>
              <SelectItem value="all" className="text-xs">All (Detailed)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
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

      {/* Totals */}
      {totals && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalSessions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all campaigns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totals.totalConversions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.avgConversionRate}% conversion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totals.totalRevenue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">All campaigns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.avgConversionRate}%</div>
              <p className="text-xs text-muted-foreground">Overall performance</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Table */}
      <DataTable
        data={analytics}
        columns={utmColumns}
        isLoading={isFetching}
        getRowId={(row: UTMAnalyticRow) => `${row.source}-${row.medium}-${row.campaign}`}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
            No UTM data found. <br /> Make sure your campaigns use UTM parameters.
          </div>
        }
      />
    </div>
  );
}
