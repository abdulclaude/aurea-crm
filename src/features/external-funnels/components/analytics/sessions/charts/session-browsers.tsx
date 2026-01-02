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
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Chrome, Compass } from "lucide-react";
import { motion, useInView } from "framer-motion";

type SessionBrowsersChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

export function SessionBrowsersChart({
  funnelId,
  timeRange,
}: SessionBrowsersChartProps) {
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

  const trend = React.useMemo(() => {
    if (!data || data.browsers.length === 0) return 0;

    const chromeBrowser = data.browsers.find((b) =>
      b.browser.toLowerCase().includes("chrome")
    );

    if (!chromeBrowser) return 0;

    const chromePercentage = chromeBrowser.percentage;
    const avgPercentage = 100 / data.browsers.length;

    return chromePercentage - avgPercentage;
  }, [data]);

  if (data.totalSessions === 0) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-1 pb-0">
        <CardHeader>
          <CardTitle className="text-sm">Session browsers</CardTitle>
          <CardDescription className="text-xs">
            No browser data available for the selected time range
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getBrowserIcon = (browserName: string) => {
    const name = browserName.toLowerCase();
    if (name.includes("chrome")) return Chrome;
    return Compass;
  };

  const getBrowserColor = (browserName: string) => {
    const name = browserName.toLowerCase();
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
    <Card
      className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-1 pb-0"
      ref={ref}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Session Browsers
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
              {data.totalSessions.toLocaleString()} sessions •{" "}
              {data.browsers.length.toLocaleString()} browsers
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-0">
          {data.browsers.map((browser, index) => {
            const opacity = 1 - index * 0.12;
            const BrowserIcon = getBrowserIcon(browser.browser);

            return (
              <div
                key={browser.browser}
                className={cn(
                  "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                  index < data.browsers.length - 1 &&
                    "border-b border-border/50"
                )}
                style={{ opacity: Math.max(opacity, 0.4) }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={
                    isInView
                      ? { width: `${browser.percentage}%` }
                      : { width: 0 }
                  }
                  transition={{
                    duration: 0.8,
                    delay: index * 0.05,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className={cn(
                    "absolute inset-y-0 left-0",
                    getBackgroundColor(browser.browser)
                  )}
                />

                <div className="relative flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg",
                      getBrowserColor(browser.browser)
                    )}
                  >
                    <BrowserIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{browser.browser}</div>
                    <div className="text-xs text-muted-foreground">
                      {browser.percentage.toFixed(1)}% of total
                      {browser.revenue > 0 &&
                        ` • $${browser.revenue.toLocaleString()}`}
                    </div>
                  </div>
                </div>

                <div className="relative text-right">
                  <div className="text-2xl font-bold font-mono">
                    {browser.sessions.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {data.browsers.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No browser data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
