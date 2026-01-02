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
import { Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, useInView } from "framer-motion";

type PurchaseActivityHeatmapProps = {
  funnelId: string;
  timeRange: "7d" | "30d" | "90d";
};

export function PurchaseActivityHeatmap({
  funnelId,
  timeRange,
}: PurchaseActivityHeatmapProps) {
  const trpc = useTRPC();
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Get heatmap data
  const { data: heatmapData } = useSuspenseQuery(
    trpc.externalFunnels.getPurchaseActivityHeatmap.queryOptions({
      funnelId,
      timeRange,
    })
  );

  if (!heatmapData) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0">
        <CardHeader>
          <CardTitle className="text-sm">Purchase Activity Heatmap</CardTitle>
          <CardDescription className="text-xs">Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Format hour for display (12-hour format) - FIXED
  const formatHour = (hour: number) => {
    if (hour === 0) return "12am";
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return "12pm";
    return `${hour - 12}pm`;
  };

  // Format hour for labels (shorter version)
  const formatHourLabel = (hour: number) => {
    if (hour === 0) return "12a";
    if (hour < 12) return `${hour}a`;
    if (hour === 12) return "12p";
    return `${hour - 12}p`;
  };

  // Get color intensity based on purchase count
  const getColorIntensity = (count: number) => {
    if (count === 0) return "bg-muted/30";
    
    const maxCount = heatmapData.maxPurchases;
    const intensity = count / maxCount;

    if (intensity >= 0.8) return "bg-green-500";
    if (intensity >= 0.6) return "bg-green-400";
    if (intensity >= 0.4) return "bg-green-300";
    if (intensity >= 0.2) return "bg-green-200";
    return "bg-green-100 dark:bg-green-900/30";
  };

  // Format peak time for display
  const formatPeakTime = () => {
    const { day, hour } = heatmapData.peakTime;
    const hourStr = formatHour(hour);
    return `${day}, ${hourStr}`;
  };

  return (
    <Card className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-2 pb-0" ref={ref}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Purchase Activity Heatmap
              <Badge
                variant="outline"
                className="text-green-500 bg-green-500/10 border-none"
              >
                <Clock className="h-4 w-4" />
                <span>Peak: {formatPeakTime()}</span>
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              {heatmapData.totalPurchases.toLocaleString()} purchases •{" "}
              ${heatmapData.totalRevenue.toLocaleString()} revenue •{" "}
              {heatmapData.peakTime.count} at peak time
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6">
        <TooltipProvider>
          <div className="space-y-2">
            {/* Hour labels (top) */}
            <div className="flex items-center">
              <div className="w-16 shrink-0" /> {/* Spacer for day labels */}
              <div className="grid grid-cols-24 gap-0.5 flex-1">
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                  <div
                    key={hour}
                    className="text-[8px] text-center text-muted-foreground"
                  >
                    {hour % 6 === 0 ? formatHourLabel(hour) : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap Grid */}
            {heatmapData.heatmapData.map((dayData, dayIndex) => (
              <div key={dayData.day} className="flex items-center gap-2">
                {/* Day label */}
                <div className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                  {dayData.day.slice(0, 3)}
                </div>

                {/* Hour cells */}
                <div className="grid grid-cols-24 gap-0.5 flex-1">
                  {dayData.hours.map((hourData, hourIndex) => {
                    const isPeak =
                      dayData.dayIndex === heatmapData.peakTime.dayIndex &&
                      hourData.hour === heatmapData.peakTime.hour;

                    // Calculate staggered delay for animation
                    const cellIndex = dayIndex * 24 + hourIndex;
                    const delay = cellIndex * 0.003; // 3ms per cell for smooth wave

                    return (
                      <Tooltip key={hourData.hour}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={
                              isInView
                                ? { opacity: 1, scale: 1 }
                                : { opacity: 0, scale: 0.8 }
                            }
                            transition={{
                              duration: 0.3,
                              delay: delay,
                              ease: [0.25, 0.1, 0.25, 1],
                            }}
                            className={cn(
                              "aspect-square rounded-sm transition-all duration-200 hover:ring-2 hover:ring-primary hover:scale-110 cursor-pointer",
                              getColorIntensity(hourData.count),
                              isPeak && "ring-2 ring-yellow-500 scale-105"
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="space-y-1">
                            <div className="font-semibold">
                              {dayData.day}, {formatHour(hourData.hour)}
                            </div>
                            <div className="text-muted-foreground">
                              {hourData.count} purchase{hourData.count !== 1 ? "s" : ""}
                            </div>
                            {hourData.revenue > 0 && (
                              <div className="text-green-500 font-medium">
                                ${hourData.revenue.toLocaleString()} revenue
                              </div>
                            )}
                            {isPeak && (
                              <div className="text-yellow-500 text-[10px] flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Peak Time
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Less</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-sm bg-muted/30" />
                <div className="w-4 h-4 rounded-sm bg-green-100 dark:bg-green-900/30" />
                <div className="w-4 h-4 rounded-sm bg-green-200" />
                <div className="w-4 h-4 rounded-sm bg-green-300" />
                <div className="w-4 h-4 rounded-sm bg-green-400" />
                <div className="w-4 h-4 rounded-sm bg-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">More</span>
            </div>
          </div>
        </TooltipProvider>

        {heatmapData.totalPurchases === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No purchase data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
