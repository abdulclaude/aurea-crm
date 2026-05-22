"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Shapes } from "lucide-react";
import { ChartShell } from "./chart-shell";
import { DashboardCategoricalTooltip } from "./dashboard-chart-tooltip";
import { ChartLoadingState } from "./chart-loading-state";
import {
  getCategoricalAxisLabel,
  getCategoricalBarSize,
} from "../helpers";

type PlanBreakdownItem = {
  id: string;
  name: string;
  color: string | null;
  classes: number;
};

export function ChartPlanBreakdown({
  data,
  isEditing,
  isLoading,
}: {
  data: PlanBreakdownItem[];
  isEditing?: boolean;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <ChartShell title="By class type" isEditing={isEditing}>
        <ChartLoadingState variant="category-bar" />
      </ChartShell>
    );
  }

  if (!data || data.length === 0) {
    return (
      <ChartShell title="By class type" isEditing={isEditing}>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Shapes className="mb-2 size-5 text-black/15" />
          <p className="text-[10px] text-black/40">No class types yet</p>
        </div>
      </ChartShell>
    );
  }

  const sorted = [...data].sort((a, b) => b.classes - a.classes);
  const chartData = sorted.map((classType, index) => ({
    name: classType.name,
    tooltipTitle: classType.name,
    axisLabel: getCategoricalAxisLabel(classType.name, index, sorted.length),
    count: classType.classes,
    colour: classType.color ?? "#94a3b8",
  }));
  const barSize = getCategoricalBarSize(chartData.length);

  return (
    <ChartShell title="By class type" isEditing={isEditing}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 10, left: 10, bottom: 20 }}
          barCategoryGap={chartData.length > 12 ? "42%" : "24%"}
          barGap={barSize ? -barSize : -8}
        >
          <CartesianGrid
            strokeDasharray="8 8"
            vertical={false}
            stroke="rgba(0,0,0,0.06)"
          />
          <XAxis
            dataKey="axisLabel"
            tick={{ fontSize: 9, fill: "rgba(0,0,0,0.35)" }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            interval={0}
            minTickGap={chartData.length > 10 ? 12 : 4}
          />
          <Tooltip
            cursor={false}
            content={
              <DashboardCategoricalTooltip
                metricLabel="Classes"
                metricKey="count"
                color="#94a3b8"
              />
            }
            animationDuration={200}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={barSize}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.colour} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
