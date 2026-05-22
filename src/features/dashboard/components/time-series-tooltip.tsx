"use client";

import { formatRangeDurationLabel } from "@/features/dashboard/comparison-utils";
import { DASHBOARD_COMPARE_COLOUR } from "../constants";
import {
  DashboardTooltipFrame,
  DashboardTooltipRow,
  tooltipValueToNumber,
  type DashboardTooltipPayload,
} from "./dashboard-chart-tooltip";

type TimeSeriesTooltipProps = {
  active?: boolean;
  payload?: DashboardTooltipPayload[];
  label?: string;
  metricLabel: string;
  metricKey: string;
  compareKey: string;
  range: { start: Date; end: Date };
  color: string;
  valueFormatter?: (value: number) => string;
};

export function TimeSeriesTooltip({
  active,
  payload,
  label,
  metricLabel,
  metricKey,
  compareKey,
  range,
  color,
  valueFormatter = (value) => value.toLocaleString(),
}: TimeSeriesTooltipProps) {
  if (!active || !payload?.length) return null;

  const current = payload.find((item) => item.dataKey === metricKey);
  const previous = payload.find((item) => item.dataKey === compareKey);
  const title = current?.payload?.fullLabel ?? label ?? "";
  const duration = formatRangeDurationLabel(range);

  return (
    <DashboardTooltipFrame title={title}>
      {current && (
        <DashboardTooltipRow
          color={color}
          label={metricLabel}
          value={valueFormatter(tooltipValueToNumber(current.value))}
        />
      )}
      {previous && (
        <DashboardTooltipRow
          color={DASHBOARD_COMPARE_COLOUR}
          label={`Previous ${metricLabel.toLowerCase()} (${duration})`}
          value={valueFormatter(tooltipValueToNumber(previous.value))}
        />
      )}
    </DashboardTooltipFrame>
  );
}
