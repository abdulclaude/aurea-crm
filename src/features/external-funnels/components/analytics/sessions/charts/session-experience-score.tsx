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

type SessionExperienceScoreChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

const chartConfig = {
  avgExperienceScore: {
    label: "Avg Experience Score",
    color: "hsl(142, 76%, 36%)",
  },
} satisfies ChartConfig;

export function SessionExperienceScoreChart({
  funnelId,
  timeRange,
}: SessionExperienceScoreChartProps) {
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

  return (
    <Card className="rounded-none shadow-none border-x-0 border-y-0 md:col-span-1 pb-0">
      <CardHeader>
        <div>
          <CardTitle className="text-sm">Experience score</CardTitle>
          <CardDescription className="text-xs">
            {(data.avgExperienceScore ?? 0).toLocaleString()} avg score
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
                          Experience Score
                        </span>
                      </div>
                      <span className="text-xs font-mono font-semibold">
                        {Number(entry.value).toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="avgExperienceScore"
              stroke="var(--color-avgExperienceScore)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
