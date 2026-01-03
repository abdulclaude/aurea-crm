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
import { getDeviceIcon as getDeviceIconForType } from "@/constants/devices";

type SessionDevicesChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

export function SessionDevicesChart({
  funnelId,
  timeRange,
}: SessionDevicesChartProps) {
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
    refetchIntervalInBackground: true,  });


  if (data.totalSessions === 0) {
    return (
      <Card className="rounded-none shadow-none border-l-0 border-t-0 md:col-span-1 pb-0">
        <CardHeader>
          <CardTitle className="text-sm">Devices</CardTitle>
          <CardDescription className="text-xs">
            No device data available for the selected time range
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getDeviceIcon = (deviceType: string) => {
    return getDeviceIconForType(deviceType);
  };

  const getDeviceColor = (index: number, deviceType: string) => {
    const type = deviceType.toLowerCase();

    if (type === "mobile")
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    if (type === "desktop")
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    if (type === "tablet")
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";

    const colors = [
      "bg-green-500/10 text-green-600 dark:text-green-400",
      "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    ];
    return colors[index % colors.length];
  };

  const getBackgroundColor = (index: number, deviceType: string) => {
    const type = deviceType.toLowerCase();
    if (type === "mobile") return "bg-blue-500/10";
    if (type === "desktop") return "bg-purple-500/10";
    if (type === "tablet") return "bg-orange-500/10";

    const colors = ["bg-green-500/10", "bg-pink-500/10"];
    return colors[index % colors.length];
  };

  return (
    <Card
      className="rounded-none shadow-none border-l-0 border-t-0 md:col-span-1 pb-0"
      ref={ref}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Devices</CardTitle>
            <CardDescription className="text-xs">
              {data.totalSessions.toLocaleString()} sessions •{" "}
              {data.deviceTypes.length.toLocaleString()} device types
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-0">
          {data.deviceTypes.map((device, index) => {
            const DeviceIcon = getDeviceIcon(device.deviceType);

            return (
              <div
                key={device.deviceType}
                className={cn(
                  "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                  index < data.deviceTypes.length - 1 &&
                    "border-b border-border/50"
                )}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={
                    isInView ? { width: `${device.percentage}%` } : { width: 0 }
                  }
                  transition={{
                    duration: 0.8,
                    delay: index * 0.05,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className={cn(
                    "absolute inset-y-0 left-0",
                    getBackgroundColor(index, device.deviceType)
                  )}
                />

                <div className="relative flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg",
                      getDeviceColor(index, device.deviceType)
                    )}
                  >
                    <DeviceIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium capitalize">
                      {device.deviceType}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {device.percentage.toFixed(1)}% of total
                      {device.revenue > 0 &&
                        ` • $${device.revenue.toLocaleString()} revenue`}
                    </div>
                  </div>
                </div>

                <div className="relative text-right">
                  <div className="text-2xl font-bold font-mono">
                    {device.sessions.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {data.deviceTypes.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No device data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
