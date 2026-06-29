"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartShell } from "./chart-shell";
import { EdgeAwareXTick } from "./edge-aware-x-tick";
import { CompareSwitch } from "./compare-switch";
import { TimeSeriesTooltip } from "./time-series-tooltip";
import { ChartLoadingState } from "./chart-loading-state";
import {
  DASHBOARD_COMPARE_COLOUR,
  DASHBOARD_REVENUE_COLOUR,
} from "../constants";
import {
  getTimeSeriesChartPresentation,
  getVisibleXAxisTicks,
} from "../helpers";

export function ChartRevenue({
  data,
  comparisonData,
  range,
  isEditing,
  isLoading,
}: {
  data: { label: string; displayLabel: string; fullLabel?: string; revenue: number }[];
  comparisonData?: { label: string; fullLabel?: string; revenue: number }[] | null;
  range: { start: Date; end: Date };
  isEditing?: boolean;
  isLoading?: boolean;
}) {
  const merged = useMemo(() => {
    if (!comparisonData?.length) return data;
    const len = Math.max(data.length, comparisonData.length);
    const rows: { label: string; displayLabel: string; fullLabel?: string; revenue: number; compareRevenue?: number }[] = [];
    for (let i = 0; i < len; i++) {
      const base = data[i];
      const comp = comparisonData[i];
      rows.push({
        label: base?.label ?? comp?.label ?? "",
        fullLabel: base?.fullLabel ?? comp?.fullLabel,
        displayLabel: base?.displayLabel ?? "",
        revenue: base?.revenue ?? 0,
        compareRevenue: comp?.revenue,
      });
    }
    return rows;
  }, [data, comparisonData]);
  const presentation = getTimeSeriesChartPresentation(
    merged.length,
    !!comparisonData?.length,
  );
  const xTicks = useMemo(() => getVisibleXAxisTicks(merged), [merged]);

  return (
    <ChartShell
      title="Revenue over time"
      isEditing={isEditing}
      right={<CompareSwitch ownerId="chart-revenue" range={range} />}
    >
      {isLoading ? (
        <ChartLoadingState variant="area" />
      ) : (
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={merged}
          margin={presentation.margin}
        >
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={DASHBOARD_REVENUE_COLOUR} stopOpacity={0.3} />
              <stop offset="95%" stopColor={DASHBOARD_REVENUE_COLOUR} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="revenueCmpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={DASHBOARD_COMPARE_COLOUR} stopOpacity={0.2} />
              <stop offset="95%" stopColor={DASHBOARD_COMPARE_COLOUR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="8 8"
            vertical={false}
            stroke="rgba(0,0,0,0.06)"
          />
          <XAxis
            dataKey="label"
            tick={<EdgeAwareXTick />}
            ticks={xTicks}
            axisLine={false}
            tickLine={false}
            interval={0}
            minTickGap={presentation.density === "sparse" ? 4 : 10}
            tickMargin={presentation.xTickMargin}
            padding={{ left: 0, right: 0 }}
          />
          <Tooltip
            cursor={false}
            content={
              <TimeSeriesTooltip
                metricLabel="Revenue"
                metricKey="revenue"
                compareKey="compareRevenue"
                range={range}
                color={DASHBOARD_REVENUE_COLOUR}
                valueFormatter={(value) => `£${value.toLocaleString()}`}
              />
            }
            animationDuration={200}
          />
          <Area
            type={presentation.areaType}
            dataKey="revenue"
            stroke={DASHBOARD_REVENUE_COLOUR}
            strokeWidth={presentation.strokeWidth}
            fill="url(#revenueFill)"
            dot={false}
            activeDot={{ r: presentation.activeDotRadius, fill: DASHBOARD_REVENUE_COLOUR }}
          />
          {comparisonData && comparisonData.length > 0 && (
            <Area
              type={presentation.areaType}
              dataKey="compareRevenue"
              stroke={DASHBOARD_COMPARE_COLOUR}
              strokeWidth={Math.max(1.1, presentation.strokeWidth - 0.25)}
              strokeDasharray="4 3"
              fill="url(#revenueCmpFill)"
              dot={false}
              activeDot={{
                r: Math.max(2.5, presentation.activeDotRadius - 0.5),
                fill: DASHBOARD_COMPARE_COLOUR,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      )}
    </ChartShell>
  );
}
