"use client";

import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BarChart,
  Bar,
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

export function ChartMemberships({
  data,
  comparisonData,
  range,
  isEditing,
  isLoading,
}: {
  data: { label: string; displayLabel: string; fullLabel?: string; newMemberships: number }[];
  comparisonData?: { label: string; fullLabel?: string; newMemberships: number }[] | null;
  range: { start: Date; end: Date };
  isEditing?: boolean;
  isLoading?: boolean;
}) {
  const isMobile = useIsMobile();
  const merged = useMemo(() => {
    if (!comparisonData?.length) return data;
    const len = Math.max(data.length, comparisonData.length);
    const rows: { label: string; displayLabel: string; fullLabel?: string; newMemberships: number; compareMemberships?: number }[] = [];
    for (let i = 0; i < len; i++) {
      const base = data[i];
      const comp = comparisonData[i];
      rows.push({
        label: base?.label ?? comp?.label ?? "",
        fullLabel: base?.fullLabel ?? comp?.fullLabel,
        displayLabel: base?.displayLabel ?? "",
        newMemberships: base?.newMemberships ?? 0,
        compareMemberships: comp?.newMemberships,
      });
    }
    return rows;
  }, [data, comparisonData]);
  const hasComparison = !!comparisonData?.length;
  const presentation = getTimeSeriesChartPresentation(
    merged.length,
    hasComparison,
  );
  const xTicks = useMemo(
    () => getVisibleXAxisTicks(merged, isMobile ? 5 : undefined),
    [isMobile, merged],
  );

  return (
    <ChartShell
      title="New memberships"
      isEditing={isEditing}
      right={<CompareSwitch ownerId="chart-memberships" range={range} />}
    >
      {isLoading ? (
        <ChartLoadingState variant="bar" />
      ) : (
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={merged}
          margin={presentation.margin}
          barCategoryGap={presentation.barCategoryGap}
        >
          <defs>
            <linearGradient id="membershipFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="membershipCmpFill" x1="0" y1="0" x2="0" y2="1">
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
                metricLabel="Memberships"
                metricKey="newMemberships"
                compareKey="compareMemberships"
                range={range}
                color="#10b981"
              />
            }
            animationDuration={200}
          />
          <Bar
            dataKey="newMemberships"
            fill="url(#membershipFill)"
            radius={[2, 2, 0, 0]}
            barSize={presentation.barSize}
          />
          {comparisonData && comparisonData.length > 0 && (
            <Bar
              dataKey="compareMemberships"
              fill="url(#membershipCmpFill)"
              radius={[2, 2, 0, 0]}
              barSize={presentation.compareBarSize}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      )}
    </ChartShell>
  );
}
