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

type OutboundLinksChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

export function OutboundLinksChart({
  funnelId,
  timeRange,
}: OutboundLinksChartProps) {
  const trpc = useTRPC();
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const { data } = useSuspenseQuery({
    ...trpc.externalFunnels.getEventPropertiesBreakdown.queryOptions({
      funnelId,
      eventName: "outbound_link_click",
      timeRange,
      limit: 10,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,  });

  if (data.totalEvents === 0) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0">
        <CardHeader>
          <CardTitle className="text-sm">Outbound links</CardTitle>
          <CardDescription className="text-xs">
            No outbound link clicks for the selected time range
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const urlProperty = data.properties.find(
    (prop) => prop.propertyKey === "url"
  );
  const destinationProperty =
    urlProperty ||
    data.properties.find((prop) => prop.propertyKey === "destination");

  const breakdown = destinationProperty?.breakdown || [];
  const totalClicks = breakdown.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card
      className="rounded-none shadow-none border-l-0 border-y-0 md:col-span-1 pb-0"
      ref={ref}
    >
      <CardHeader>
        <div>
          <CardTitle className="text-sm">Outbound links</CardTitle>
          <CardDescription className="text-xs">
            {data.totalEvents.toLocaleString()} total clicks
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <div className="space-y-0">
          {breakdown.map((item, index) => {
            const percent =
              totalClicks > 0 ? (item.count / totalClicks) * 100 : 0;
            const bgOpacity = Math.max(1 - index * 0.12, 0.4);

            return (
              <div
                key={item.value}
                className={cn(
                  "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                  index < breakdown.length - 1 && "border-y border-border/50"
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
                    backgroundColor: `rgba(59, 130, 246, ${bgOpacity * 0.12})`,
                  }}
                />

                <div className="relative flex flex-col">
                  <div className="text-sm font-medium break-all">
                    {item.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {percent.toFixed(1)}% of clicks
                  </div>
                </div>

                <div className="relative text-right">
                  <div className="text-2xl font-bold font-mono">
                    {item.count.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {breakdown.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No outbound link data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
