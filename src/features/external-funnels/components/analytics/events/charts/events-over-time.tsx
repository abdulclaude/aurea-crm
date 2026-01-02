"use client";

import * as React from "react";
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
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";

type EventsOverTimeChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

const chartConfig = {
  events: {
    label: "Events",
    color: "hsl(144.18, 100%, 39.41%)", // Green color like in the example
  },
} satisfies ChartConfig;

export function EventsOverTimeChart({
  funnelId,
  timeRange,
}: EventsOverTimeChartProps) {
  const trpc = useTRPC();
  const [interval, setInterval] = React.useState<
    "15min" | "30min" | "hour" | "4hour" | "day"
  >("15min");

  const { data } = useSuspenseQuery({
    ...trpc.externalFunnels.getEventsOverTime.queryOptions({
      funnelId,
      timeRange,
      interval,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,  });

  if (data.totalEvents === 0) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0">
        <CardHeader>
          <CardTitle className="text-sm">Events Over Time</CardTitle>
          <CardDescription className="text-xs">
            No event data available for the selected time range
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate trend (compare first half vs second half)
  const midpoint = Math.floor(data.data.length / 2);
  const firstHalfTotal = data.data
    .slice(0, midpoint)
    .reduce((sum, d) => sum + d.events, 0);
  const secondHalfTotal = data.data
    .slice(midpoint)
    .reduce((sum, d) => sum + d.events, 0);

  const firstHalfAvg = firstHalfTotal / Math.max(midpoint, 1);
  const secondHalfAvg =
    secondHalfTotal / Math.max(data.data.length - midpoint, 1);
  const trend =
    firstHalfAvg > 0
      ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
      : 0;

  return (
    <Card className="rounded-none shadow-none border-x-0 md:col-span-2 pb-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Events over time
            </CardTitle>
            <CardDescription className="text-xs">
              {data.totalEvents.toLocaleString()} total events
            </CardDescription>
          </div>

          <Select
            value={interval}
            onValueChange={(value) =>
              setInterval(value as "15min" | "30min" | "hour" | "4hour" | "day")
            }
          >
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15min">15 minutes</SelectItem>
              <SelectItem value="30min">30 minutes</SelectItem>
              <SelectItem value="hour">1 hour</SelectItem>
              <SelectItem value="4hour">4 hours</SelectItem>
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
            data={data.data}
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
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  labelFormatter={(value) => value}
                />
              }
            />
            <Bar dataKey="events" fill="var(--color-events)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
