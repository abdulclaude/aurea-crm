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
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, useInView } from "framer-motion";

type EventFrequencyChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

type FrequencyBucket = {
  bucket: string;
  label: string;
  userCount: number;
  totalEvents: number;
  percentage: number;
};

export function EventFrequencyChart({
  funnelId,
  timeRange,
}: EventFrequencyChartProps) {
  const trpc = useTRPC();
  const [selectedEvent, setSelectedEvent] = React.useState<string | null>(null);
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  // Get events data
  const { data: eventsData } = useSuspenseQuery({
    ...trpc.externalFunnels.getEventsTrend.queryOptions({
      funnelId,
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,  });

  // Get frequency breakdown for selected event
  const { data: frequencyData } = useSuspenseQuery({
    ...trpc.externalFunnels.getEventFrequencyDistribution.queryOptions({
      funnelId,
      eventName: selectedEvent || eventsData.eventTypes[0]?.eventName || "",
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,  });

  // Auto-select first event if none selected
  React.useEffect(() => {
    if (!selectedEvent && eventsData.eventTypes.length > 0) {
      setSelectedEvent(eventsData.eventTypes[0].eventName);
    }
  }, [eventsData, selectedEvent]);

  // Calculate trend
  const trend = React.useMemo(() => {
    if (!frequencyData || frequencyData.distribution.length === 0) return 0;

    const buckets = frequencyData.distribution;
    const repeatUsers = buckets
      .filter((b) => b.bucket !== "1")
      .reduce((sum, b) => sum + b.userCount, 0);
    const totalUsers = buckets.reduce((sum, b) => sum + b.userCount, 0);

    if (totalUsers === 0) return 0;

    return (repeatUsers / totalUsers) * 100 - 50; // Compare to 50% baseline
  }, [frequencyData]);

  const eventGroups = React.useMemo(() => {
    const grouped = new Map<string, typeof eventsData.eventTypes>();
    for (const event of eventsData.eventTypes) {
      const category = event.category || "Uncategorized";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(event);
    }

    return Array.from(grouped.entries())
      .map(([category, events]) => ({
        category,
        events: events.sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [eventsData.eventTypes]);

  const selectedEventLabel =
    eventsData.eventTypes.find((event) => event.eventName === selectedEvent)
      ?.eventName || "Select event";

  if (!frequencyData || !selectedEvent) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0">
        <CardHeader>
          <CardTitle className="text-sm">Event Frequency</CardTitle>
          <CardDescription className="text-xs">Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card
      className="rounded-none shadow-none border-x-0 border-t-0 pb-0 md:col-span-2"
      ref={ref}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Event frequency
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
              {frequencyData.totalUsers.toLocaleString()} unique users •{" "}
              {frequencyData.totalEvents.toLocaleString()} total {selectedEvent}{" "}
              • {frequencyData.avgFrequency.toFixed(2)} avg
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-xs !h-8">
                <span className="truncate">{selectedEventLabel}</span>
                <ChevronDown className="ml-2 size-3.5 text-primary/60 dark:text-white/60" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[220px] p-1">
              {eventGroups.map((group) => (
                <DropdownMenuSub key={group.category}>
                  <DropdownMenuSubTrigger className="text-xs">
                    {group.category}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-[240px] p-1 mr-2">
                    {group.events.map((event) => (
                      <DropdownMenuCheckboxItem
                        key={event.eventName}
                        checked={event.eventName === selectedEvent}
                        onSelect={() => setSelectedEvent(event.eventName)}
                        className="text-xs"
                      >
                        {event.eventName}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <div className="space-y-0">
          {frequencyData.distribution.map((bucket, index) => {
            const opacity = 1 - index * 0.12; // Fade out as we go down
            const isLowFrequency = bucket.bucket === "1";

            return (
              <div
                key={bucket.bucket}
                className={cn(
                  "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                  index < frequencyData.distribution.length - 1 &&
                    "border-b border-border/50"
                )}
                style={{ opacity: Math.max(opacity, 0.4) }}
              >
                {/* Background fill based on percentage */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={
                    isInView ? { width: `${bucket.percentage}%` } : { width: 0 }
                  }
                  transition={{
                    duration: 0.8,
                    delay: index * 0.05,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className={cn(
                    "absolute inset-y-0 left-0",
                    isLowFrequency ? "bg-yellow-500/10" : "bg-green-500/10"
                  )}
                />

                {/* Content */}
                <div className="relative flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg text-xs font-semibold",
                      isLowFrequency
                        ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                        : "bg-green-500/20 text-green-600 dark:text-green-400"
                    )}
                  >
                    {bucket.label}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {bucket.userCount.toLocaleString()} unique users
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {bucket.percentage.toFixed(1)}% of total •{" "}
                      {bucket.totalEvents.toLocaleString()} events
                    </div>
                  </div>
                </div>

                <div className="relative text-right">
                  <div className="text-2xl font-bold font-mono">
                    {bucket.userCount.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {frequencyData.distribution.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No frequency data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
