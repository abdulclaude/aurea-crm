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
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
  pageViews: {
    label: "Page Views",
    color: "hsl(211, 100%, 50%)",
  },
  conversions: {
    label: "Conversions",
    color: "hsl(24, 94%, 54%)",
  },
} satisfies ChartConfig;

export function SessionsOverTimeChart({
  funnelId,
  timeRange,
}: SessionsOverTimeChartProps) {
  const trpc = useTRPC();
  const [interval, setInterval] = React.useState<"hour" | "day">(
    timeRange === "24h" ? "hour" : "day"
  );

  React.useEffect(() => {
    setInterval(timeRange === "24h" ? "hour" : "day");
  }, [timeRange]);

  const { data } = useSuspenseQuery({
    ...trpc.externalFunnels.getSessionsTrend.queryOptions({
      funnelId,
      timeRange,
      interval,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const chartData = React.useMemo(() => {
    return data.timeSeries.map((item) => ({
      ...item,
      date:
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Sessions over time</CardTitle>
            <CardDescription className="text-xs">
              {data.totalSessions.toLocaleString()} total sessions •{" "}
              {data.totalConversions.toLocaleString()} conversions
            </CardDescription>
          </div>
          <Select
            value={interval}
            onValueChange={(value) => setInterval(value as "hour" | "day")}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">1 hour</SelectItem>
              <SelectItem value="day">24 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              hide
              domain={[0, (dataMax: number) => Math.max(0, dataMax)]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[200px] text-primary!"
                  labelFormatter={(value) => value}
                />
              }
            />
            <Bar dataKey="sessions" fill="var(--color-sessions)" />
            <Bar dataKey="pageViews" fill="var(--color-pageViews)" />
            <Bar dataKey="conversions" fill="var(--color-conversions)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
