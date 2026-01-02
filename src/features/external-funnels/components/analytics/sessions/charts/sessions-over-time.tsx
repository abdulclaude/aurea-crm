"use client";

import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

type SessionsOverTimeChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "hsl(144.18, 100%, 39.41%)",
  },
  conversions: {
    label: "Conversions",
    color: "hsl(24, 94%, 54%)",
  },
} satisfies ChartConfig;

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
};

export function SessionsOverTimeChart({
  funnelId,
  timeRange,
}: SessionsOverTimeChartProps) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery({
    ...trpc.externalFunnels.getSessionsTrend.queryOptions({
      funnelId,
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const chartData = React.useMemo(() => {
    return data.timeSeries.map((item) => ({
      ...item,
      formattedDate:
        data.interval === "hour"
          ? format(new Date(item.timestamp), "MMM d, ha")
          : format(new Date(item.timestamp), "MMM d"),
    }));
  }, [data]);

  if (data.totalSessions === 0) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-2 pb-0">
        <CardHeader>
          <CardTitle className="text-sm">Sessions over time</CardTitle>
          <CardDescription className="text-xs">
            No session data available for the selected time range
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-none shadow-none border-x-0 md:col-span-2 pb-0">
      <CardHeader>
        <div>
          <CardTitle className="text-sm">Sessions over time</CardTitle>
          <CardDescription className="text-xs">
            {data.totalSessions.toLocaleString()} total sessions •{" "}
            {data.totalConversions.toLocaleString()} conversions
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <ComposedChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="formattedDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              interval="preserveStartEnd"
              padding={{ left: 12, right: 12 }}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              content={
                ({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  return (
                    <div className="border-border/50 bg-background grid min-w-[11rem] gap-2 rounded-lg border px-2.5 py-2 text-xs shadow-xl">
                      <div className="text-xs text-muted-foreground">
                        {label}
                      </div>
                      <div className="grid gap-1.5">
                        {payload.map((entry) => (
                          <div
                            key={entry.dataKey?.toString()}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-xs font-medium">
                                {entry.name}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-semibold">
                              {Number(entry.value).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-1.5">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-muted-foreground">
                            Page Views:
                          </span>
                          <span className="text-xs font-mono font-semibold">
                            {item.pageViews.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-muted-foreground">
                            Avg Duration:
                          </span>
                          <span className="text-xs font-mono font-semibold">
                            {formatDuration(item?.avgDuration || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
              }
            />
            <Line
              type="monotone"
              dataKey="sessions"
              stroke="var(--color-sessions)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="conversions"
              stroke="var(--color-conversions)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
