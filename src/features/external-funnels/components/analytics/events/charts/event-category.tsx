"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingDown, TrendingUp } from "lucide-react";
import React from "react";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

type EventCategoryChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

// Category color mapping with vibrant, distinct colors
const CATEGORY_COLORS: Record<string, string> = {
  viewing: "hsl(210, 85%, 55%)", // Blue
  engagement: "hsl(280, 75%, 60%)", // Purple
  high_engagement: "hsl(320, 85%, 60%)", // Fuchsia/Pink
  intent: "hsl(25, 90%, 55%)", // Orange
  conversion: "hsl(145, 65%, 50%)", // Green
  session: "hsl(190, 80%, 50%)", // Cyan
  performance: "hsl(45, 95%, 55%)", // Yellow
  custom: "hsl(260, 70%, 65%)", // Lavender
  uncategorized: "hsl(0, 0%, 60%)", // Gray
};

// Generate a consistent random color for unknown categories
const getRandomColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 65 + (Math.abs(hash >> 8) % 25); // 65-90%
  const lightness = 50 + (Math.abs(hash >> 16) % 15); // 50-65%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const CATEGORY_LABELS: Record<string, string> = {
  viewing: "Viewing",
  engagement: "Engagement",
  high_engagement: "High Engagement",
  intent: "Intent",
  conversion: "Conversion",
  session: "Session",
  performance: "Performance",
  custom: "Custom",
  uncategorized: "Uncategorized",
};

export function EventCategoryChart({
  funnelId,
  timeRange,
}: EventCategoryChartProps) {
  const trpc = useTRPC();
  const [interval, setInterval] = React.useState<"15min" | "30min" | "hour" | "4hour" | "day">("4hour");

  const { data: categoryData } = useSuspenseQuery(
    trpc.externalFunnels.getEventCategoryTrend.queryOptions({
      funnelId,
      timeRange,
      interval,
    })
  );

  if (categoryData.totalEvents === 0) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0">
        <CardHeader>
          <CardTitle className="text-sm">Event Categories</CardTitle>
          <CardDescription className="text-xs">
            No event data available for the selected time range
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Build chart config dynamically from categories
  const chartConfig: ChartConfig = {};
  for (const category of categoryData.categories) {
    chartConfig[category] = {
      label: CATEGORY_LABELS[category] || category,
      color: CATEGORY_COLORS[category] || getRandomColor(category),
    };
  }

  // Calculate trend (compare first half vs second half)
  const midpoint = Math.floor(categoryData.data.length / 2);
  const firstHalfTotal = categoryData.data
    .slice(0, midpoint)
    .reduce((sum, d) => {
      return (
        sum +
        categoryData.categories.reduce(
          (catSum, cat) => catSum + (d[cat] || 0),
          0
        )
      );
    }, 0);
  const secondHalfTotal = categoryData.data.slice(midpoint).reduce((sum, d) => {
    return (
      sum +
      categoryData.categories.reduce((catSum, cat) => catSum + (d[cat] || 0), 0)
    );
  }, 0);

  const firstHalfAvg = firstHalfTotal / Math.max(midpoint, 1);
  const secondHalfAvg =
    secondHalfTotal / Math.max(categoryData.data.length - midpoint, 1);
  const trend =
    firstHalfAvg > 0
      ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
      : 0;

  return (
    <Card className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Event Categories
              <Badge
                variant="outline"
                className={`${
                  trend >= 0
                    ? "text-green-500 bg-green-500/10"
                    : "text-red-500 bg-red-500/10"
                } border-none`}
              >
                {trend >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>
                  {trend >= 0 ? "+" : ""}
                  {trend.toFixed(1)}%
                </span>
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              {categoryData.totalEvents.toLocaleString()} events across{" "}
              {categoryData.categories.length} categories
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
              <SelectItem value="15min">15 Minutes</SelectItem>
              <SelectItem value="30min">30 Minutes</SelectItem>
              <SelectItem value="hour">Hourly</SelectItem>
              <SelectItem value="4hour">4 Hours</SelectItem>
              <SelectItem value="day">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-0 pr-2">
        <ChartContainer config={chartConfig}>
          <AreaChart accessibilityLayer data={categoryData.data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.split(" ")[0]}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(1)}k`;
                }
                return value.toString();
              }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            {categoryData.categories.map((category) => (
              <Area
                key={category}
                dataKey={category}
                type="natural"
                fill={chartConfig[category]?.color}
                fillOpacity={0.4}
                stroke={chartConfig[category]?.color}
                stackId="a"
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
