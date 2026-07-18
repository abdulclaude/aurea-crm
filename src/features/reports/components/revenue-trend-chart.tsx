"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueDataPoint {
  date: string;
  amount: number;
}

export function RevenueTrendChart({
  data,
  currency,
  locale,
}: {
  data: RevenueDataPoint[];
  currency: string;
  locale: string;
}) {
  if (!data.length) return null;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
            >
              <defs>
                <linearGradient id="revTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(0,0,0,0.06)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatter.format(Number(value))}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(v) => [
                  formatter.format(Number(v ?? 0)),
                  "Revenue",
                ]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#revTrendFill)"
                dot={false}
                activeDot={{ r: 4, fill: "#f59e0b" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
