"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartTableToggle } from "@/components/chart-table-toggle";
import { useTRPC } from "@/trpc/client";
import { SessionsOverTimeChart } from "./analytics/sessions/charts/sessions-over-time";
import { SessionDurationDistributionChart } from "./analytics/sessions/charts/session-duration-distribution";
import { SessionAvgDurationChart } from "./analytics/sessions/charts/session-avg-duration";
import { SessionAvgPageViewsChart } from "./analytics/sessions/charts/session-avg-pageviews";
import { SessionDevicesChart } from "./analytics/sessions/charts/session-devices";
import { SessionBrowsersChart } from "./analytics/sessions/charts/session-browsers";
import { SessionExperienceScoreChart } from "./analytics/sessions/charts/session-experience-score";

type SessionsChartProps = {
  funnelId: string;
};

export function SessionsChart({ funnelId }: SessionsChartProps) {
  const trpc = useTRPC();
  const [timeRange, setTimeRange] = React.useState<
    "24h" | "7d" | "30d" | "90d"
  >("7d");
  const [view, setView] = useQueryState(
    "sessionsView",
    parseAsString.withDefault("table")
  );

  const handleViewChange = React.useCallback(
    (newView: "chart" | "table") => {
      setView(newView);
    },
    [setView]
  );

  const { data } = useSuspenseQuery({
    ...trpc.externalFunnels.getSessionsTrend.queryOptions({
      funnelId,
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,  });

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"></div>
        <div className="flex items-center gap-0">
          <ChartTableToggle
            view={view as "chart" | "table"}
            onViewChange={handleViewChange}
          />
          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as typeof timeRange)}
          >
            <SelectTrigger className="w-[140px] h-full text-xs ring-0 shadow-none rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h" className="text-xs">
                Last 24 hours
              </SelectItem>
              <SelectItem value="7d" className="text-xs">
                Last 7 days
              </SelectItem>
              <SelectItem value="30d" className="text-xs">
                Last 30 days
              </SelectItem>
              <SelectItem value="90d" className="text-xs">
                Last 90 days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {data.totalSessions === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
          No sessions found. <br /> Data will appear once sessions start coming
          in.
        </div>
      ) : (
        <div className="grid md:grid-cols-2">
          <SessionsOverTimeChart funnelId={funnelId} timeRange={timeRange} />
          <SessionDurationDistributionChart
            funnelId={funnelId}
            timeRange={timeRange}
          />
          <SessionAvgDurationChart funnelId={funnelId} timeRange={timeRange} />
          <SessionDevicesChart funnelId={funnelId} timeRange={timeRange} />
          <SessionBrowsersChart funnelId={funnelId} timeRange={timeRange} />
          <SessionAvgPageViewsChart funnelId={funnelId} timeRange={timeRange} />
          <SessionExperienceScoreChart
            funnelId={funnelId}
            timeRange={timeRange}
          />
        </div>
      )}
    </div>
  );
}
