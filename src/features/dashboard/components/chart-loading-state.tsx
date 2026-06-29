"use client";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
} from "recharts";

import {
  getLoadingData,
  LoadingIndicator,
} from "@/components/evilcharts/ui/chart";

type ChartLoadingVariant = "area" | "bar" | "category-bar";

type ChartLoadingStateProps = {
  variant: ChartLoadingVariant;
  points?: number;
};

type LoadingDatum = {
  label: string;
  loading: number;
};

export function ChartLoadingState({
  variant,
  points = variant === "category-bar" ? 7 : 14,
}: ChartLoadingStateProps) {
  const gradientId = useId().replace(/:/g, "");
  const data = useMemo<LoadingDatum[]>(
    () =>
      getLoadingData(points, 18, 78).map((item, index) => ({
        label: String(index + 1),
        loading: item.loading,
      })),
    [points],
  );

  return (
    <div className="relative h-full w-full">
      <LoadingIndicator isLoading />
      <div className="h-full w-full animate-pulse opacity-70">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {variant === "area" ? (
            <AreaChart
              data={data}
              margin={{ top: 14, right: 14, left: 14, bottom: 18 }}
            >
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="rgba(0,0,0,0.14)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="rgba(0,0,0,0.04)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="8 8"
                vertical={false}
                stroke="rgba(0,0,0,0.06)"
              />
              <XAxis dataKey="label" hide />
              <Area
                type="natural"
                dataKey="loading"
                stroke="rgba(0,0,0,0.14)"
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <BarChart
              data={data}
              margin={{ top: 14, right: 14, left: 14, bottom: 18 }}
              barCategoryGap={variant === "category-bar" ? "36%" : "24%"}
            >
              <CartesianGrid
                strokeDasharray="8 8"
                vertical={false}
                stroke="rgba(0,0,0,0.06)"
              />
              <XAxis dataKey="label" hide />
              <Bar
                dataKey="loading"
                fill="rgba(0,0,0,0.11)"
                radius={[2, 2, 0, 0]}
                barSize={variant === "category-bar" ? 28 : 14}
                isAnimationActive={false}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
