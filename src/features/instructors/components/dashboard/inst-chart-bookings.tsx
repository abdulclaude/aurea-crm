"use client";

import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartShell } from "@/features/dashboard/components";
import { TOOLTIP_STYLE, TOOLTIP_LABEL, TOOLTIP_ITEM } from "@/features/dashboard/components/tooltip-styles";

export function InstChartBookings({
  data,
  isEditing,
  right,
}: {
  data: { label: string; avg: number }[];
  isEditing?: boolean;
  right?: React.ReactNode;
}) {
  const display = data.map((d, i, arr) => {
    const step = Math.max(1, Math.floor((arr.length - 1) / 6));
    const show = i === 0 || i === arr.length - 1 || i % step === 0;
    return { ...d, displayLabel: show ? d.label : "" };
  });

  return (
    <ChartShell title="Avg. bookings per class" isEditing={isEditing} right={right}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={display}
          margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
        >
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
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL}
            itemStyle={TOOLTIP_ITEM}
            formatter={(v) => [v, "Avg. bookings"]}
            labelFormatter={(_, p) => {
              const lbl = p?.[0]?.payload?.label;
              return lbl ? `Week of ${lbl}` : "";
            }}
            animationDuration={200}
          />
          <Bar
            dataKey="avg"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
