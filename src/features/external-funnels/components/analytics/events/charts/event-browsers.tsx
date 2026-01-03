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
import { TrendingUp, TrendingDown } from "lucide-react";
import { getBrowserIcon as getBrowserIconForType } from "@/constants/browsers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, useInView } from "framer-motion";

type EventBrowsersChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

export function EventBrowsersChart({
  funnelId,
  timeRange,
}: EventBrowsersChartProps) {
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

  // Get browser breakdown for selected event
  const { data: browserData } = useSuspenseQuery(
    trpc.externalFunnels.getEventBrowsers.queryOptions({
      funnelId,
      eventName: selectedEvent || undefined, // undefined = All Events
      timeRange,
    })
  );

  // Calculate trend (Chrome vs other browsers)
  const trend = React.useMemo(() => {
    if (!browserData || browserData.browsers.length === 0) return 0;

    const chromeBrowser = browserData.browsers.find((b) =>
      b.browserName.toLowerCase().includes("chrome")
    );

    if (!chromeBrowser) return 0;

    const chromePercentage = chromeBrowser.percentage;
    const avgPercentage = 100 / browserData.totalBrowsers;

    // Positive trend = Chrome dominance
    return chromePercentage - avgPercentage;
  }, [browserData]);

  if (!browserData) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0">
        <CardHeader>
          <CardTitle className="text-sm">Event Browsers</CardTitle>
          <CardDescription className="text-xs">Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Get icon for browser
  const getBrowserIcon = (browserName: string) => {
    return getBrowserIconForType(browserName);
  };

  // Get color for each browser based on name
  const getBrowserColor = (browserName: string) => {
    const name = browserName.toLowerCase();

    // Brand-specific colors
    if (name.includes("chrome"))
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    if (name.includes("firefox"))
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    if (name.includes("safari"))
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    if (name.includes("edge"))
      return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400";
    if (name.includes("opera"))
      return "bg-red-500/10 text-red-600 dark:text-red-400";

    return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
  };

  const getBackgroundColor = (browserName: string) => {
    const name = browserName.toLowerCase();

    if (name.includes("chrome")) return "bg-yellow-500/10";
    if (name.includes("firefox")) return "bg-orange-500/10";
    if (name.includes("safari")) return "bg-blue-500/10";
    if (name.includes("edge")) return "bg-cyan-500/10";
    if (name.includes("opera")) return "bg-red-500/10";

    return "bg-gray-500/10";
  };

  return (
    <Card className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-1 pb-0" ref={ref}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Event Browsers
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
              {browserData.totalEvents.toLocaleString()} events •{" "}
              {browserData.totalBrowsers.toLocaleString()} browsers
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
          {browserData.browsers.map((browser, index) => {
            const opacity = 1 - index * 0.12; // Fade out as we go down
            const BrowserIcon = getBrowserIcon(browser.browserName);

            return (
              <div
                key={browser.browserName}
                className={cn(
                  "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                  index < browserData.browsers.length - 1 &&
                    "border-b border-border/50"
                )}
                style={{ opacity: Math.max(opacity, 0.4) }}
              >
                {/* Background fill based on percentage */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${browser.percentage}%` } : { width: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.05,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className={cn(
                    "absolute inset-y-0 left-0",
                    getBackgroundColor(browser.browserName)
                  )}
                />

                {/* Content */}
                <div className="relative flex items-center gap-3">
                  {/* Browser Icon */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg",
                      getBrowserColor(browser.browserName)
                    )}
                  >
                    <BrowserIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {browser.browserName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {browser.percentage.toFixed(1)}% of total
                      {browser.topVersion !== "Unknown" &&
                        ` • v${browser.topVersion.split(".")[0]}`}
                      {browser.revenue > 0 &&
                        ` • $${browser.revenue.toLocaleString()}`}
                    </div>
                  </div>
                </div>

                <div className="relative text-right">
                  <div className="text-2xl font-bold font-mono">
                    {browser.count.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {browserData.browsers.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No browser data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
