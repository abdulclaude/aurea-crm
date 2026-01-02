"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Smartphone,
  Monitor,
  Tablet,
  HelpCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, useInView } from "framer-motion";

type EventDevicesChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

export function EventDevicesChart({
  funnelId,
  timeRange,
}: EventDevicesChartProps) {
  const trpc = useTRPC();
  const [selectedEvent, setSelectedEvent] = React.useState<string | null>(null);
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  // Get events data for selector
  const { data: eventsData } = useSuspenseQuery(
    trpc.externalFunnels.getEventsTrend.queryOptions({
      funnelId,
      timeRange,
    })
  );

  // Get device breakdown for selected event
  const { data: deviceData } = useSuspenseQuery(
    trpc.externalFunnels.getEventDevices.queryOptions({
      funnelId,
      eventName: selectedEvent || undefined, // undefined = All Events
      timeRange,
    })
  );

  // Calculate trend (mobile vs desktop dominance)
  const trend = React.useMemo(() => {
    if (!deviceData || deviceData.devices.length === 0) return 0;

    const mobileDevice = deviceData.devices.find(
      (d) => d.deviceType.toLowerCase() === "mobile"
    );
    const desktopDevice = deviceData.devices.find(
      (d) => d.deviceType.toLowerCase() === "desktop"
    );

    if (!mobileDevice && !desktopDevice) return 0;

    const mobilePercentage = mobileDevice?.percentage || 0;
    const desktopPercentage = desktopDevice?.percentage || 0;

    // Positive trend = mobile dominance, negative = desktop dominance
    return mobilePercentage - desktopPercentage;
  }, [deviceData]);

  if (!deviceData) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0">
        <CardHeader>
          <CardTitle className="text-sm">Event Devices</CardTitle>
          <CardDescription className="text-xs">Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Get icon for device type
  const getDeviceIcon = (deviceType: string) => {
    const type = deviceType.toLowerCase();

    if (type === "mobile") return Smartphone;
    if (type === "desktop") return Monitor;
    if (type === "tablet") return Tablet;
    return HelpCircle;
  };

  // Get color for each device based on ranking
  const getDeviceColor = (index: number, deviceType: string) => {
    const type = deviceType.toLowerCase();

    // Special colors for common device types
    if (type === "mobile")
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    if (type === "desktop")
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    if (type === "tablet")
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";

    // Fallback to index-based colors
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
            <CardTitle className="text-sm flex items-center gap-2">
              Event Devices
              <Badge
                variant="outline"
                className={`${
                  trend >= 0
                    ? "text-blue-500 bg-blue-500/10"
                    : "text-purple-500 bg-purple-500/10"
                } border-none`}
              >
                {trend >= 0 ? (
                  <Smartphone className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
                <span>
                  {trend >= 0 ? "+" : ""}
                  {trend.toFixed(1)}%
                </span>
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              {deviceData.totalEvents.toLocaleString()} events •{" "}
              {deviceData.totalDevices.toLocaleString()} device types
            </CardDescription>
          </div>

          <Select
            value={selectedEvent || "all"}
            onValueChange={(value) =>
              setSelectedEvent(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="text-xs !h-6 !px-1.5 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all" className="text-xs">
                All Events
              </SelectItem>
              {eventsData.eventTypes.map((event) => (
                <SelectItem
                  key={event.eventName}
                  value={event.eventName}
                  className="text-xs"
                >
                  {event.eventName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <div className="space-y-0">
          {deviceData.devices.map((device, index) => {
            const opacity = 1 - index * 0.12; // Fade out as we go down
            const DeviceIcon = getDeviceIcon(device.deviceType);

            return (
              <div
                key={device.deviceType}
                className={cn(
                  "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                  index < deviceData.devices.length - 1 &&
                    "border-b border-border/50"
                )}
                style={{ opacity: Math.max(opacity, 0.4) }}
              >
                {/* Background fill based on percentage */}
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

                {/* Content */}
                <div className="relative flex items-center gap-3">
                  {/* Device Icon */}
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
                    {device.count.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {deviceData.devices.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No device data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
