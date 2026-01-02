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
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

type SessionAvgDurationChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

const chartConfig = {
  avgDuration: {
    label: "Average duration (min)",
    color: "hsl(206, 94%, 54%)",
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

export function SessionAvgDurationChart({
  funnelId,
  timeRange,
}: SessionAvgDurationChartProps) {
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
      avgDurationMinutes: Number((item.avgDuration / 60).toFixed(1)),
    }));
  }, [data]);

  return (
    <Card className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-1 pb-0">
      <CardHeader>
        <div>
          <CardTitle className="text-sm">Average session duration</CardTitle>
          <CardDescription className="text-xs">
            {formatDuration(data.avgDuration)} overall
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
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

            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const entry = payload[0];
                return (
                  <div className="border-border/50 bg-background grid min-w-[11rem] gap-2 rounded-lg border px-2.5 py-2 text-xs shadow-xl">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs font-medium">
                          Avg Duration
                        </span>
                      </div>
                      <span className="text-xs font-mono font-semibold">
                        {Number(entry.value).toFixed(1)}m
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="avgDurationMinutes"
              stroke="var(--color-avgDuration)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
