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
import { DASHBOARD_COMPARE_COLOUR } from "../constants";
import {
  getTimeSeriesChartPresentation,
  getVisibleXAxisTicks,
} from "../helpers";

export function ChartVisits({
  data,
  comparisonData,
  range,
  isEditing,
  isLoading,
}: {
  data: { label: string; displayLabel: string; fullLabel?: string; visits: number }[];
  comparisonData?: { label: string; fullLabel?: string; visits: number }[] | null;
  range: { start: Date; end: Date };
  isEditing?: boolean;
  isLoading?: boolean;
}) {
  const merged = useMemo(() => {
    if (!comparisonData?.length) return data;
    const len = Math.max(data.length, comparisonData.length);
    const rows: { label: string; displayLabel: string; fullLabel?: string; visits: number; compareVisits?: number }[] = [];
    for (let i = 0; i < len; i++) {
      const base = data[i];
      const comp = comparisonData[i];
      rows.push({
        label: base?.label ?? comp?.label ?? "",
        fullLabel: base?.fullLabel ?? comp?.fullLabel,
        displayLabel: base?.displayLabel ?? "",
        visits: base?.visits ?? 0,
        compareVisits: comp?.visits,
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
      title="Visits over time"
      isEditing={isEditing}
      right={<CompareSwitch ownerId="chart-visits" range={range} />}
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
            <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="visitsCmpFill" x1="0" y1="0" x2="0" y2="1">
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
                metricLabel="Visits"
                metricKey="visits"
                compareKey="compareVisits"
                range={range}
                color="#6366f1"
              />
            }
            animationDuration={200}
          />
          <Area
            type={presentation.areaType}
            dataKey="visits"
            stroke="#6366f1"
            strokeWidth={presentation.strokeWidth}
            fill="url(#visitsFill)"
            dot={false}
            activeDot={{ r: presentation.activeDotRadius, fill: "#6366f1" }}
          />
          {comparisonData && comparisonData.length > 0 && (
            <Area
              type={presentation.areaType}
              dataKey="compareVisits"
              stroke={DASHBOARD_COMPARE_COLOUR}
              strokeWidth={Math.max(1.1, presentation.strokeWidth - 0.25)}
              strokeDasharray="4 3"
              fill="url(#visitsCmpFill)"
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
