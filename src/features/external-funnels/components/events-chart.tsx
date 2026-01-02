"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartTableToggle } from "@/components/chart-table-toggle";
import { useTRPC } from "@/trpc/client";
import { EventTypeChart } from "@/features/external-funnels/components/analytics/events/charts/event-type";
import { EventAttributionChart } from "./analytics/events/charts/event-attribution";
import { EventPropertiesChart } from "./analytics/events/charts/event-properties";
import { EventFrequencyChart } from "./analytics/events/charts/event-frequency";
import { EventGeographyChart } from "./analytics/events/charts/event-geography";
import { PurchaseActivityHeatmap } from "./analytics/events/charts/purchase-activity-heatmap";
import { EventDevicesChart } from "./analytics/events/charts/event-devices";
import { EventBrowsersChart } from "./analytics/events/charts/event-browsers";
import { EventEngagementChart } from "./analytics/events/charts/event-engagement";
import { EventCategoryChart } from "./analytics/events/charts/event-category";
import { EventsOverTimeChart } from "./analytics/events/charts/events-over-time";
import { OutboundLinksChart } from "./analytics/events/charts/outbound-links";
import { OutboundDomainsChart } from "./analytics/events/charts/outbound-domains";
import { EventCategoryPerformance } from "./analytics/events/charts/event-category-performance";

type EventsChartProps = {
  funnelId: string;
};

export function EventsChart({ funnelId }: EventsChartProps) {
  const trpc = useTRPC();
  const [timeRange, setTimeRange] = React.useState<
    "24h" | "7d" | "30d" | "90d"
  >("7d");
  const [view, setView] = useQueryState(
    "eventsView",
    parseAsString.withDefault("table")
  );

  const handleViewChange = React.useCallback(
    (newView: "chart" | "table") => {
      setView(newView);
    },
    [setView]
  );

  const { data, isFetching } = useSuspenseQuery({
    ...trpc.externalFunnels.getEventsTrend.queryOptions({
      funnelId,
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,  });

  const chartConfig = {
    totalEvents: {
      label: "Total Events",
      color: "hsl(var(--chart-1))",
    },
    pageViews: {
      label: "Page Views",
      color: "hsl(var(--chart-2))",
    },
    customEvents: {
      label: "Custom Events",
      color: "hsl(var(--chart-3))",
    },
    conversions: {
      label: "Conversions",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig;

  // Format data for line chart
  const lineChartData = React.useMemo(() => {
    return data.timeSeries.map((item) => ({
      ...item,
      formattedDate:
        data.interval === "hour"
          ? format(new Date(item.timestamp), "MMM d, ha")
          : format(new Date(item.timestamp), "MMM d"),
    }));
  }, [data]);

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"></div>
        <div className="flex items-center gap-0">
          <ChartTableToggle
            view={view as "chart" | "table"}
            onViewChange={handleViewChange}
          />

          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as typeof timeRange)}
          >
            <SelectTrigger className="w-[140px] h-full text-xs ring-0 shadow-none rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h" className="text-xs">
                Last 24 hours
              </SelectItem>
              <SelectItem value="7d" className="text-xs">
                Last 7 days
              </SelectItem>
              <SelectItem value="30d" className="text-xs">
                Last 30 days
              </SelectItem>
              <SelectItem value="90d" className="text-xs">
                Last 90 days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}

      {data.totalEvents === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
          No events found. <br /> Data will appear once events start coming in.
        </div>
      ) : (
        <div className="grid md:grid-cols-2">
          {/* Line Chart - Events Over Time */}
          <EventsOverTimeChart funnelId={funnelId} timeRange={timeRange} />

          {/* Area Chart - Event Categories */}
          {/* <EventCategoryChart funnelId={funnelId} timeRange={timeRange} /> */}

          {/* Bar Chart - Event Types */}
          {/* <EventTypeChart funnelId={funnelId} timeRange={timeRange} /> */}

          <EventGeographyChart funnelId={funnelId} timeRange={timeRange} />

          <OutboundLinksChart funnelId={funnelId} timeRange={timeRange} />
          <OutboundDomainsChart funnelId={funnelId} timeRange={timeRange} />

          <EventCategoryPerformance funnelId={funnelId} timeRange={timeRange} />

          <EventEngagementChart funnelId={funnelId} timeRange={timeRange} />

          <EventFrequencyChart funnelId={funnelId} timeRange={timeRange} />

          {/* <PurchaseActivityHeatmap
            funnelId={funnelId}
            timeRange={timeRange === "24h" ? "7d" : timeRange}
          /> */}

          {/* <EventPropertiesChart funnelId={funnelId} timeRange={timeRange} /> */}
        </div>
      )}
    </div>
  );
}
