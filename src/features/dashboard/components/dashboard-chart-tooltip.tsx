"use client";

import type { ReactNode } from "react";

import { formatRangeDurationLabel } from "@/features/dashboard/comparison-utils";
import { DASHBOARD_COMPARE_COLOUR } from "../constants";

export type DashboardTooltipPayload = {
  dataKey?: string | number;
  value?: unknown;
  payload?: {
    label?: string;
    fullLabel?: string;
    tooltipTitle?: string;
    name?: string;
    day?: string;
    colour?: string;
  };
};

type DashboardTooltipFrameProps = {
  title: string;
  children: ReactNode;
};

type DashboardTooltipRowProps = {
  color: string;
  label: string;
  value: string;
};

type DashboardCategoricalTooltipProps = {
  active?: boolean;
  payload?: DashboardTooltipPayload[];
  label?: string;
  metricLabel: string;
  metricKey: string;
  color: string;
  compareKey?: string;
  range?: { start: Date; end: Date };
  valueFormatter?: (value: number) => string;
};

export function tooltipValueToNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function DashboardTooltipFrame({
  title,
  children,
}: DashboardTooltipFrameProps) {
  return (
    <div className="w-max rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[11px] shadow-lg">
      <p className="w-max whitespace-nowrap font-medium text-black/50">
        {title}
      </p>
      <div className="-mx-3 my-2 h-px bg-black/[0.08]" />
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

export function DashboardTooltipRow({
  color,
  label,
  value,
}: DashboardTooltipRowProps) {
  return (
    <div className="flex w-max items-center justify-between gap-6 whitespace-nowrap">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-black/65">{label}</span>
      </div>
      <span className="font-medium tabular-nums text-black/85">{value}</span>
    </div>
  );
}

export function DashboardCategoricalTooltip({
  active,
  payload,
  label,
  metricLabel,
  metricKey,
  color,
  compareKey,
  range,
  valueFormatter = (value) => value.toLocaleString(),
}: DashboardCategoricalTooltipProps) {
  if (!active || !payload?.length) return null;

  const current = payload.find((item) => item.dataKey === metricKey);
  const previous = compareKey
    ? payload.find((item) => item.dataKey === compareKey)
    : undefined;
  const title =
    current?.payload?.tooltipTitle ??
    current?.payload?.fullLabel ??
    current?.payload?.name ??
    current?.payload?.day ??
    label ??
    "";
  const currentColor = current?.payload?.colour ?? color;
  const duration = range ? formatRangeDurationLabel(range) : null;
  const previousLabel = duration
    ? `Previous ${metricLabel.toLowerCase()} (${duration})`
    : `Previous ${metricLabel.toLowerCase()}`;

  return (
    <DashboardTooltipFrame title={title}>
      {current && (
        <DashboardTooltipRow
          color={currentColor}
          label={metricLabel}
          value={valueFormatter(tooltipValueToNumber(current.value))}
        />
      )}
      {previous && (
        <DashboardTooltipRow
          color={DASHBOARD_COMPARE_COLOUR}
          label={previousLabel}
          value={valueFormatter(tooltipValueToNumber(previous.value))}
        />
      )}
    </DashboardTooltipFrame>
  );
}
