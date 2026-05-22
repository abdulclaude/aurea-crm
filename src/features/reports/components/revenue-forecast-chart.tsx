"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ForecastData {
  currentMrr: number;
  forecast: { month: string; projected: number; atRisk: number }[];
}

export function RevenueForecastChart({ data }: { data: ForecastData }) {
  const chartData = data.forecast.map((f) => ({
    month: f.month,
    projected: f.projected,
    atRisk: f.atRisk,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue Forecast</CardTitle>
        <CardDescription>
          Current MRR: £{data.currentMrr.toLocaleString()} — projected based on active memberships
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 12, left: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `£${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(v, name) => [
                  `£${Number(v ?? 0).toLocaleString()}`,
                  name === "projected" ? "Projected Revenue" : "At-Risk Revenue",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="projected" name="Projected" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="atRisk" name="At Risk" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
