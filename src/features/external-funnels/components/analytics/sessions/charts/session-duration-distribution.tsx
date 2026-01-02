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
import { motion, useInView } from "framer-motion";

type SessionDurationDistributionChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

export function SessionDurationDistributionChart({
  funnelId,
  timeRange,
}: SessionDurationDistributionChartProps) {
  const trpc = useTRPC();
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const { data } = useSuspenseQuery({
    ...trpc.externalFunnels.getSessionsTrend.queryOptions({
      funnelId,
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const totalSessions = data.durationDistribution.reduce(
    (sum, bucket) => sum + bucket.count,
    0
  );

  if (data.totalSessions === 0) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-1 pb-0">
        <CardHeader>
          <CardTitle className="text-sm">Session duration</CardTitle>
          <CardDescription className="text-xs">
            No session data available for the selected time range
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card
      className="rounded-none shadow-none border-l-0 border-t-0 md:col-span-1 pb-0"
      ref={ref}
    >
      <CardHeader>
        <div>
          <CardTitle className="text-sm">Session duration</CardTitle>
          <CardDescription className="text-xs">
            {totalSessions.toLocaleString()} total sessions
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-0">
          {data.durationDistribution.map((bucket, index) => {
            const percent =
              totalSessions > 0 ? (bucket.count / totalSessions) * 100 : 0;
            const opacity = Math.max(1 - index * 0.12, 0.4);

            return (
              <div
                key={bucket.range}
                className={cn(
                  "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                  index < data.durationDistribution.length - 1 &&
                    "border-b border-border/50"
                )}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${percent}%` } : { width: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.05,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="absolute inset-y-0 left-0"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${opacity * 0.12})`,
                  }}
                />

                <div className="relative flex flex-col">
                  <div className="text-sm font-medium">{bucket.range}</div>
                  <div className="text-xs text-muted-foreground">
                    {percent.toFixed(1)}% of sessions
                  </div>
                </div>

                <div className="relative text-right">
                  <div className="text-2xl font-bold font-mono">
                    {bucket.count.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
