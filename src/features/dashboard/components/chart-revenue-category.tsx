"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartShell } from "./chart-shell";
import { CompareSwitch } from "./compare-switch";
import { CATEGORY_COLOURS, DASHBOARD_COMPARE_COLOUR } from "../constants";
import { DashboardCategoricalTooltip } from "./dashboard-chart-tooltip";
import { ChartLoadingState } from "./chart-loading-state";
import {
  formatDashboardMoney,
  getCategoricalAxisLabel,
  getCategoricalAxisLabelLines,
  getCategoricalBarSize,
} from "../helpers";

type CategoryAxisTickProps = {
  payload?: { value?: string };
  x?: number;
  y?: number;
};

function CategoryAxisTick({
  payload,
  x = 0,
  y = 0,
}: CategoryAxisTickProps): React.ReactNode {
  const lines = getCategoricalAxisLabelLines(payload?.value ?? "");

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        fill="rgba(0,0,0,0.35)"
        fontSize={9}
        textAnchor="middle"
      >
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={0} dy={11}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export function ChartRevenueCategory({
  data,
  comparisonData,
  range,
  isEditing,
  isLoading,
  currency,
}: {
  data: { category: string; label: string; revenue: number }[];
  comparisonData?: { category: string; label: string; revenue: number }[] | null;
  range: { start: Date; end: Date };
  isEditing?: boolean;
  isLoading?: boolean;
  currency?: string;
}) {
  const merged = useMemo(() => {
    const withLabels = data.map((item, index) => ({
      ...item,
      tooltipTitle: item.label,
      axisLabel: getCategoricalAxisLabel(item.label, index, data.length),
      colour: CATEGORY_COLOURS[item.category] ?? "#94a3b8",
    }));
    if (!comparisonData?.length) return withLabels;
    const catMap = new Map(comparisonData.map((c) => [c.category, c.revenue]));
    return withLabels.map((d) => ({
      ...d,
      compareRevenue: catMap.get(d.category),
    }));
  }, [data, comparisonData]);
  const hasComparison = !!comparisonData?.length;
  const barSize = getCategoricalBarSize(merged.length, hasComparison);

  return (
    <ChartShell
      title="Revenue by category"
      isEditing={isEditing}
      right={<CompareSwitch ownerId="chart-revenue-category" range={range} />}
    >
      {isLoading ? (
        <ChartLoadingState variant="category-bar" />
      ) : (
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={merged}
          margin={{ top: 4, right: 10, left: 10, bottom: 0 }}
          barCategoryGap={merged.length > 12 ? "42%" : "24%"}
        >
          <defs>
            <linearGradient id="revCatCmpFill" x1="0" y1="0" x2="0" y2="1">
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
            dataKey="axisLabel"
            tick={<CategoryAxisTick />}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            height={36}
            interval={0}
            minTickGap={merged.length > 10 ? 12 : 4}
          />
          <Tooltip
            cursor={false}
            content={
              <DashboardCategoricalTooltip
                metricLabel="Revenue"
                metricKey="revenue"
                compareKey="compareRevenue"
                range={range}
                color="#94a3b8"
                valueFormatter={(value) => formatDashboardMoney(value, currency)}
              />
            }
            animationDuration={200}
          />
          <Bar
            dataKey="revenue"
            radius={[2, 2, 0, 0]}
            barSize={barSize}
          >
            {merged.map((entry) => (
              <Cell
                key={entry.category}
                fill={entry.colour}
              />
            ))}
          </Bar>
          {comparisonData && comparisonData.length > 0 && (
            <Bar
              dataKey="compareRevenue"
              fill="url(#revCatCmpFill)"
              radius={[2, 2, 0, 0]}
              barSize={barSize}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      )}
    </ChartShell>
  );
}
