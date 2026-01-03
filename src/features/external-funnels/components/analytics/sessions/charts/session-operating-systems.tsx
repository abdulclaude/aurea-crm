"use client";

import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getOsIcon as getOsIconForType } from "@/constants/os";
import { motion, useInView } from "framer-motion";

type SessionOperatingSystemsChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

export function SessionOperatingSystemsChart({
  funnelId,
  timeRange,
}: SessionOperatingSystemsChartProps) {
  const trpc = useTRPC();
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const deviceRange = timeRange === "24h" ? "7d" : timeRange;

  const { data } = useSuspenseQuery({
    ...trpc.externalFunnels.getDeviceAnalytics.queryOptions({
      funnelId,
      timeRange: deviceRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  if (data.totalSessions === 0) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-1 pb-0">
        <CardHeader>
          <CardTitle className="text-sm">Operating systems</CardTitle>
          <CardDescription className="text-xs">
            No OS data available for the selected time range
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getOsIcon = (osName: string) => {
    return getOsIconForType(osName);
  };

  const getOsColor = (osName: string) => {
    const name = osName.toLowerCase();
    if (name.includes("windows"))
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    if (name.includes("mac") || name.includes("os x"))
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400";
    if (name.includes("ios"))
      return "bg-slate-400/10 text-slate-700 dark:text-slate-300";
    if (name.includes("android"))
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    if (name.includes("linux"))
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    if (name.includes("chrome os"))
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
  };

  const getBackgroundColor = (osName: string) => {
    const name = osName.toLowerCase();
    if (name.includes("windows")) return "bg-blue-500/10";
    if (name.includes("mac") || name.includes("os x")) return "bg-slate-500/10";
    if (name.includes("ios")) return "bg-slate-400/10";
    if (name.includes("android")) return "bg-green-500/10";
    if (name.includes("linux")) return "bg-orange-500/10";
    if (name.includes("chrome os")) return "bg-yellow-500/10";
    return "bg-gray-500/10";
  };

  return (
    <Card
      className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-1 pb-0"
      ref={ref}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Operating systems</CardTitle>
            <CardDescription className="text-xs">
              {data.totalSessions.toLocaleString()} sessions •{" "}
              {data.operatingSystems.length.toLocaleString()} operating systems
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-0">
          {data.operatingSystems.map((os, index) => {
            const OsIcon = getOsIcon(os.os);

            return (
              <div
                key={os.os}
                className={cn(
                  "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                  index < data.operatingSystems.length - 1 &&
                    "border-b border-border/50"
                )}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={
                    isInView ? { width: `${os.percentage}%` } : { width: 0 }
                  }
                  transition={{
                    duration: 0.8,
                    delay: index * 0.05,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className={cn(
                    "absolute inset-y-0 left-0",
                    getBackgroundColor(os.os)
                  )}
                />

                <div className="relative flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg",
                      getOsColor(os.os)
                    )}
                  >
                    <OsIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{os.os}</div>
                    <div className="text-xs text-muted-foreground">
                      {os.percentage.toFixed(1)}% of total
                      {os.revenue > 0 &&
                        ` • $${os.revenue.toLocaleString()}`}
                    </div>
                  </div>
                </div>

                <div className="relative text-right">
                  <div className="text-2xl font-bold font-mono">
                    {os.sessions.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {data.operatingSystems.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No OS data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
