"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useRef, useState, useMemo } from "react";
import { useSpring, useMotionValueEvent } from "motion/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

type EventAttributionChartProps = {
  funnelId: string;
  timeRange: "7d" | "30d" | "90d";
};

export function EventAttributionChart({ funnelId, timeRange }: EventAttributionChartProps) {
  const trpc = useTRPC();

  const { data } = useSuspenseQuery(
    trpc.externalFunnels.getUTMAnalytics.queryOptions({
      funnelId,
      timeRange,
      groupBy: "source",
    })
  );

  // Get top source by revenue
  const topSource = useMemo(() => {
    if (!data.analytics || data.analytics.length === 0) {
      return { source: "Direct", revenue: 0, sessions: 0, conversions: 0, conversionRate: 0 };
    }
    
    return data.analytics.reduce((max, current) => {
      return current.revenue > max.revenue ? current : max;
    }, data.analytics[0]);
  }, [data.analytics]);

  // Calculate trend (compare first half vs second half)
  const trend = useMemo(() => {
    if (data.analytics.length === 0) return 0;
    
    const midPoint = Math.floor(data.analytics.length / 2);
    const firstHalf = data.analytics.slice(0, midPoint);
    const secondHalf = data.analytics.slice(midPoint);
    
    const firstHalfRevenue = firstHalf.reduce((sum, item) => sum + item.revenue, 0);
    const secondHalfRevenue = secondHalf.reduce((sum, item) => sum + item.revenue, 0);
    
    if (firstHalfRevenue === 0) return secondHalfRevenue > 0 ? 100 : 0;
    
    return ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100;
  }, [data.analytics]);

  // Transform data for chart (show revenue by source over time - simplified)
  const chartData = useMemo(() => {
    return data.analytics.slice(0, 10).map((item) => ({
      name: item.source,
      value: item.revenue,
    }));
  }, [data.analytics]);

  const chartConfig = {
    value: {
      label: "Revenue",
      color: "#FCA070",
    },
  } satisfies ChartConfig;
  const chartRef = useRef<HTMLDivElement>(null);
  const [axis, setAxis] = useState(0);

  // motion values
  const springX = useSpring(0, {
    damping: 30,
    stiffness: 100,
  });
  const springY = useSpring(0, {
    damping: 30,
    stiffness: 100,
  });

  useMotionValueEvent(springX, "change", (latest) => {
    setAxis(latest);
  });

  return (
    <Card className="rounded-none shadow-none border-x-0 border-t-0">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          ${springY.get().toFixed(0)}
          <Badge variant="secondary" className="ml-2">
            {trend >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}%</span>
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Top Source: {topSource.source} • {topSource.sessions} sessions • {topSource.conversions} conversions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          ref={chartRef}
          className="h-54 w-full"
          config={chartConfig}
        >
          <AreaChart
            className="overflow-visible"
            accessibilityLayer
            data={chartData}
            onMouseMove={(state) => {
              const x = state.activeCoordinate?.x;
              const dataValue = state.activePayload?.[0]?.value;
              if (x && dataValue !== undefined) {
                springX.set(x);
                springY.set(dataValue);
              }
            }}
            onMouseLeave={() => {
              springX.set(chartRef.current?.getBoundingClientRect().width || 0);
              springY.jump(chartData[chartData.length - 1]?.value || 0);
            }}
            margin={{
              right: 0,
              left: 0,
            }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              horizontalCoordinatesGenerator={(props) => {
                const { height } = props;
                return [0, height - 30];
              }}
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + "..." : value}
            />
            <Area
              dataKey="value"
              type="monotone"
              fill="url(#gradient-cliped-area-value)"
              fillOpacity={0.4}
              stroke="var(--color-value)"
              clipPath={`inset(0 ${
                Number(chartRef.current?.getBoundingClientRect().width) - axis
              } 0 0)`}
            />
            <line
              x1={axis}
              y1={0}
              x2={axis}
              y2={"85%"}
              stroke="var(--color-value)"
              strokeDasharray="3 3"
              strokeLinecap="round"
              strokeOpacity={0.2}
            />
            <rect
              x={axis - 50}
              y={0}
              width={50}
              height={18}
              fill="var(--color-value)"
            />
            <text
              x={axis - 25}
              fontWeight={600}
              y={13}
              textAnchor="middle"
              fill="var(--primary-foreground)"
            >
              ${springY.get().toFixed(0)}
            </text>
            {/* this is a ghost line behind graph */}
            <Area
              dataKey="value"
              type="monotone"
              fill="none"
              stroke="var(--color-value)"
              strokeOpacity={0.1}
            />
            <defs>
              <linearGradient
                id="gradient-cliped-area-value"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-value)"
                  stopOpacity={0}
                />
                <mask id="mask-cliped-area-chart">
                  <rect
                    x={0}
                    y={0}
                    width={"50%"}
                    height={"100%"}
                    fill="white"
                  />
                </mask>
              </linearGradient>
            </defs>
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
