"use client";

import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartShell } from "@/features/dashboard/components";
import { TOOLTIP_STYLE, TOOLTIP_LABEL, TOOLTIP_ITEM } from "@/features/dashboard/components/tooltip-styles";

export function InstChartEarnings({
  data,
  currency,
  isEditing,
  right,
}: {
  data: { label: string; amount: number }[];
  currency?: string;
  isEditing?: boolean;
  right?: React.ReactNode;
}) {
  const cur = currency ?? "GBP";
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: cur }).format(v);

  const display = data.map((d, i, arr) => {
    const step = Math.max(1, Math.floor((arr.length - 1) / 6));
    const show = i === 0 || i === arr.length - 1 || i % step === 0;
    return { ...d, displayLabel: show ? d.label : "" };
  });

  return (
    <ChartShell title="Earnings over time" isEditing={isEditing} right={right}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={display}
          margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
        >
          <defs>
            <linearGradient id="instEarningsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="8 8"
            vertical={false}
            stroke="rgba(0,0,0,0.06)"
          />
          <XAxis
            dataKey="displayLabel"
            tick={{ fontSize: 10, fill: "rgba(0,0,0,0.35)" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip
            cursor={false}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL}
            itemStyle={TOOLTIP_ITEM}
            formatter={(v) => [fmt(v as number), "Earned"]}
            labelFormatter={(_, p) => {
              const lbl = p?.[0]?.payload?.label;
              return lbl ? `Week of ${lbl}` : "";
            }}
            animationDuration={200}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#instEarningsFill)"
            dot={false}
            activeDot={{ r: 4, fill: "#10b981" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
