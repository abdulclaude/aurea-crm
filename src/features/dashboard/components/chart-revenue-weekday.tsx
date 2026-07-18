"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartShell } from "./chart-shell";
import { CompareSwitch } from "./compare-switch";
import { DashboardCategoricalTooltip } from "./dashboard-chart-tooltip";
import { ChartLoadingState } from "./chart-loading-state";
import { DASHBOARD_COMPARE_COLOUR } from "../constants";
import { formatDashboardMoney } from "../helpers";

export function ChartRevenueWeekday({
  data,
  comparisonData,
  range,
  isEditing,
  isLoading,
  currency,
}: {
  data: { day: string; revenue: number }[];
  comparisonData?: { day: string; revenue: number }[] | null;
  range: { start: Date; end: Date };
  isEditing?: boolean;
  isLoading?: boolean;
  currency?: string;
}) {
  const merged = useMemo(() => {
    const withTitles = data.map((item) => ({
      ...item,
      tooltipTitle: item.day,
    }));
    if (!comparisonData?.length) return withTitles;
    const dayMap = new Map(comparisonData.map((c) => [c.day, c.revenue]));
    return withTitles.map((d) => ({
      ...d,
      compareRevenue: dayMap.get(d.day),
    }));
  }, [data, comparisonData]);

  return (
    <ChartShell
      title="Revenue by weekday"
      isEditing={isEditing}
      right={<CompareSwitch ownerId="chart-revenue-weekday" range={range} />}
    >
      {isLoading ? (
        <ChartLoadingState variant="category-bar" />
      ) : (
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={merged}
          margin={{ top: 4, right: 0, left: 0, bottom: 4 }}
        >
          <defs>
            <linearGradient id="weekdayFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="weekdayCmpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DASHBOARD_COMPARE_COLOUR} stopOpacity={0.85} />
              <stop offset="100%" stopColor={DASHBOARD_COMPARE_COLOUR} stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="8 8"
            vertical={false}
            stroke="rgba(0,0,0,0.06)"
          />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "rgba(0,0,0,0.35)" }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
          />
          <Tooltip
            cursor={false}
            content={
              <DashboardCategoricalTooltip
                metricLabel="Revenue"
                metricKey="revenue"
                compareKey="compareRevenue"
                range={range}
                color="#3b82f6"
                valueFormatter={(value) => formatDashboardMoney(value, currency)}
              />
            }
            animationDuration={200}
          />
          <Bar
            dataKey="revenue"
            fill="url(#weekdayFill)"
            radius={[2, 2, 0, 0]}
            barSize={comparisonData?.length ? 20 : 32}
          />
          {comparisonData && comparisonData.length > 0 && (
            <Bar
              dataKey="compareRevenue"
              fill="url(#weekdayCmpFill)"
              radius={[2, 2, 0, 0]}
              barSize={20}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      )}
    </ChartShell>
  );
}
