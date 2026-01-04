"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { SessionDevicesChart } from "@/features/external-funnels/components/analytics/sessions/charts/session-devices";
import { SessionBrowsersChart } from "@/features/external-funnels/components/analytics/sessions/charts/session-browsers";
import { SessionOperatingSystemsChart } from "@/features/external-funnels/components/analytics/sessions/charts/session-operating-systems";

const DEVICE_COLORS = {
  Desktop: "hsl(var(--chart-1))",
  Mobile: "hsl(var(--chart-2))",
  Tablet: "hsl(var(--chart-3))",
  Unknown: "hsl(var(--chart-5))",
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#a78bfa",
];

type DeviceAnalyticsProps = {
  funnelId: string;
};

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType.toLowerCase()) {
    case "desktop":
      return <Monitor className="h-4 w-4" />;
    case "mobile":
      return <Smartphone className="h-4 w-4" />;
    case "tablet":
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
};

export function DeviceAnalytics({ funnelId }: DeviceAnalyticsProps) {
  const trpc = useTRPC();
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");

  const { data, isFetching } = useSuspenseQuery(
    trpc.externalFunnels.getDeviceAnalytics.queryOptions({
      funnelId,
      timeRange,
    })
  );

  const chartConfig = {
    sessions: {
      label: "Sessions",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  return (
    <div className="">
      {data.totalSessions === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
          No device data found. <br /> Data will appear once sessions start
          coming in.
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Donut Chart - Device Type Distribution */}

          <div className="grid md:grid-cols-3">
            <SessionBrowsersChart funnelId={funnelId} timeRange={timeRange} />
            <SessionDevicesChart funnelId={funnelId} timeRange={timeRange} />

            <SessionOperatingSystemsChart
              funnelId={funnelId}
              timeRange={timeRange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
