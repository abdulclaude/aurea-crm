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
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, useInView } from "framer-motion";

type EventEngagementChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

const ITEMS_PER_PAGE = 5;

export function EventEngagementChart({
  funnelId,
  timeRange,
}: EventEngagementChartProps) {
  const trpc = useTRPC();
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [currentPage, setCurrentPage] = React.useState(1);

  // Get engagement data
  const { data: engagementData } = useSuspenseQuery({
    ...trpc.externalFunnels.getEventEngagement.queryOptions({
      funnelId,
      timeRange,
      limit: 100, // Fetch more for pagination
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,  });

  // Calculate trend (high engagement vs low engagement)
  const trend = React.useMemo(() => {
    if (!engagementData || engagementData.events.length === 0) return 0;

    const highEngagementEvents = engagementData.events.filter(
      (e) => e.avgEngagement >= 70
    ).length;

    const totalEvents = engagementData.events.length;
    const highEngagementPercentage = (highEngagementEvents / totalEvents) * 100;

    // Positive if >50% of events are high engagement
    return highEngagementPercentage - 50;
  }, [engagementData]);

  // Pagination
  const paginatedEvents = React.useMemo(() => {
    if (!engagementData) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return engagementData.events.slice(startIndex, endIndex);
  }, [engagementData, currentPage]);

  const totalPages = engagementData
    ? Math.ceil(engagementData.events.length / ITEMS_PER_PAGE)
    : 0;

  if (!engagementData) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0">
        <CardHeader>
          <CardTitle className="text-sm">Event Engagement</CardTitle>
          <CardDescription className="text-xs">Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (engagementData.totalSessions === 0) {
    return (
      <Card
        className="rounded-none shadow-none border-x-0 md:col-span-2 pb-0"
        ref={ref}
      >
        <CardHeader>
          <CardTitle className="text-sm">Event Engagement</CardTitle>
          <CardDescription className="text-xs">
            No engagement data available. Events will appear once sessions with
            engagement tracking are recorded.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Get engagement level and INVERTED colors (red = bad, green = good)
  const getEngagementLevel = (engagement: number) => {
    if (engagement >= 70)
      return {
        label: "High",
        iconColor: "text-green-600 dark:text-green-400 bg-green-500/10",
        textColor: "text-green-600 dark:text-green-400",
      };
    if (engagement >= 40)
      return {
        label: "Medium",
        iconColor: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
        textColor: "text-orange-600 dark:text-orange-400",
      };
    return {
      label: "Low",
      iconColor: "text-red-600 dark:text-red-400 bg-red-500/10",
      textColor: "text-red-600 dark:text-red-400",
    };
  };

  const getBackgroundColor = (engagement: number) => {
    if (engagement >= 70) return "bg-green-500/10";
    if (engagement >= 40) return "bg-orange-500/10";
    return "bg-red-500/10";
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  };

  return (
    <Card className="rounded-none shadow-none border-x-0 pb-0" ref={ref}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Event engagement
              <Badge
                variant="outline"
                className={`${
                  trend >= 0
                    ? "text-green-500 bg-green-500/10"
                    : "text-red-500 bg-red-500/10"
                } border-none`}
              >
                {trend >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>
                  {trend >= 0 ? "+" : ""}
                  {trend.toFixed(1)}%
                </span>
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              {engagementData.totalSessions.toLocaleString()} sessions •{" "}
              {engagementData.avgEngagement.toFixed(1)}% avg engagement •{" "}
              {engagementData.events.length} events tracked
            </CardDescription>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <div className="space-y-0">
          {paginatedEvents.map((event, index) => {
            const bgOpacity = Math.max(1 - index * 0.12, 0.4); // Fade background opacity
            const level = getEngagementLevel(event.avgEngagement);

            // Cap at 100% for display
            const displayEngagement = Math.min(event.avgEngagement, 100);

            return (
              <div
                key={event.eventName}
                className={cn(
                  "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                  index < paginatedEvents.length - 1 &&
                    "border-b border-border/50"
                )}
              >
                {/* Background fill based on engagement percentage */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={
                    isInView ? { width: `${displayEngagement}%` } : { width: 0 }
                  }
                  transition={{
                    duration: 0.8,
                    delay: index * 0.05,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className={cn("absolute inset-y-0 left-0")}
                  style={{
                    backgroundColor:
                      event.avgEngagement >= 70
                        ? `rgba(34, 197, 94, ${bgOpacity * 0.1})` // green-500 with dynamic opacity
                        : event.avgEngagement >= 40
                        ? `rgba(249, 115, 22, ${bgOpacity * 0.1})` // orange-500 with dynamic opacity
                        : `rgba(239, 68, 68, ${bgOpacity * 0.1})`, // red-500 with dynamic opacity
                  }}
                />

                {/* Content */}
                <div className="relative flex items-center gap-3">
                  {/* Engagement Icon */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg",
                      level.iconColor
                    )}
                  >
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{event.eventName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{event.sessions.toLocaleString()} sessions</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(event.avgActiveTime)} active
                      </span>
                      {event.conversions > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 dark:text-green-400">
                            {event.conversionRate}% CVR
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative text-right">
                  <div className="text-2xl font-bold font-mono">
                    {displayEngagement.toFixed(1)}%
                  </div>
                  <div className={cn("text-xs font-medium", level.textColor)}>
                    {level.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {paginatedEvents.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No event engagement data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
