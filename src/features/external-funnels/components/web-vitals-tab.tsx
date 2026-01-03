"use client";

import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { WebVitalsTable } from "./web-vitals-table";

interface WebVitalsTabProps {
  funnelId: string;
}

type WebVitalMetric = "LCP" | "INP" | "CLS" | "FCP" | "TTFB" | "FID";

const TIME_RANGES = [
  { label: "Last 24 hours", value: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "Last 7 days", value: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "Last 30 days", value: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "Last 90 days", value: "90d", ms: 90 * 24 * 60 * 60 * 1000 },
];

const THRESHOLDS: Record<WebVitalMetric, { good: number; needsImprovement: number }> = {
  LCP: { good: 2500, needsImprovement: 4000 },
  INP: { good: 200, needsImprovement: 500 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
  FID: { good: 100, needsImprovement: 300 },
};

const metricDescriptions: Record<WebVitalMetric, string> = {
  LCP: "Largest Contentful Paint",
  INP: "Interaction to Next Paint",
  CLS: "Cumulative Layout Shift",
  FCP: "First Contentful Paint",
  TTFB: "Time to First Byte",
  FID: "First Input Delay",
};

const formatValue = (metric: WebVitalMetric, value: number) => {
  if (metric === "CLS") return value.toFixed(3);
  return `${(value / 1000).toFixed(2)}s`;
};

const getRating = (metric: WebVitalMetric, value: number) => {
  const threshold = THRESHOLDS[metric];
  if (value <= threshold.good) return "GOOD";
  if (value <= threshold.needsImprovement) return "NEEDS_IMPROVEMENT";
  return "POOR";
};

const ratingLabel = (rating: "GOOD" | "NEEDS_IMPROVEMENT" | "POOR") =>
  rating === "GOOD" ? "Good" : rating === "NEEDS_IMPROVEMENT" ? "Needs improvement" : "Poor";

const ratingTextClass = (rating: "GOOD" | "NEEDS_IMPROVEMENT" | "POOR") => {
  switch (rating) {
    case "GOOD":
      return "text-green-600 dark:text-green-400";
    case "NEEDS_IMPROVEMENT":
      return "text-yellow-600 dark:text-yellow-400";
    case "POOR":
      return "text-red-600 dark:text-red-400";
  }
};

export function WebVitalsTab({ funnelId }: WebVitalsTabProps) {
  const trpc = useTRPC();
  const [timeRange, setTimeRange] = React.useState<"24h" | "7d" | "30d" | "90d">("30d");
  const range = React.useMemo(() => {
    const now = Date.now();
    const rangeItem = TIME_RANGES.find((item) => item.value === timeRange) ?? TIME_RANGES[2];
    return {
      start: new Date(now - rangeItem.ms),
      end: new Date(now),
    };
  }, [timeRange]);

  const { data } = useSuspenseQuery({
    ...trpc.webVitals.getWebVitalsStats.queryOptions({
      funnelId,
      timestampStart: range.start,
      timestampEnd: range.end,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  if (data.totalVitals === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div />
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as typeof timeRange)}>
            <SelectTrigger className="w-[160px] h-full text-xs ring-0 shadow-none rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((rangeItem) => (
                <SelectItem key={rangeItem.value} value={rangeItem.value} className="text-xs">
                  {rangeItem.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
          No web vital data found. <br /> Data will appear once measurements start coming in.
        </div>
      </div>
    );
  }

  const overallRating =
    data.passingRate >= 75 ? "GOOD" : data.passingRate >= 50 ? "NEEDS_IMPROVEMENT" : "POOR";
  const orderedStats = React.useMemo(() => {
    const order: WebVitalMetric[] = ["LCP", "INP", "CLS", "FCP", "TTFB", "FID"];
    return [...data.stats].sort((a, b) => {
      const aIndex = order.indexOf(a.metric as WebVitalMetric);
      const bIndex = order.indexOf(b.metric as WebVitalMetric);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }, [data.stats]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as typeof timeRange)}>
          <SelectTrigger className="w-[160px] h-full text-xs ring-0 shadow-none rounded-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((rangeItem) => (
              <SelectItem key={rangeItem.value} value={rangeItem.value} className="text-xs">
                {rangeItem.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-none shadow-none border-x-0 border-t-0 pb-0">
          <CardHeader>
            <CardTitle className="text-sm">Passing rate</CardTitle>
            <CardDescription className="text-xs">
              {data.totalVitals.toLocaleString()} total measurements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-semibold", ratingTextClass(overallRating))}>
              {data.passingRate.toFixed(1)}%
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {ratingLabel(overallRating)} overall
            </div>
          </CardContent>
        </Card>

        {orderedStats.map((stat) => {
          const metric = stat.metric as WebVitalMetric;
          const description = metricDescriptions[metric] ?? stat.metric;
          const rating = getRating(metric, stat.p75);
          const samples = stat.total || 0;

          return (
            <Card
              key={stat.metric}
              className="rounded-none shadow-none border-x-0 border-t-0 pb-0"
            >
              <CardHeader>
                <CardTitle className="text-sm">{stat.metric}</CardTitle>
                <CardDescription className="text-xs">
                  {description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-semibold">
                      {formatValue(metric, stat.p75)}
                    </div>
                    <div className={cn("text-xs mt-1", ratingTextClass(rating))}>
                      {ratingLabel(rating)} • P75
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {samples.toLocaleString()} samples
                    <div className="mt-1">
                      P50 {formatValue(metric, stat.p50)} • P90 {formatValue(metric, stat.p90)}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="bg-green-500/60"
                      style={{ width: `${stat.goodPercent}%` }}
                    />
                    <div
                      className="bg-yellow-500/60"
                      style={{ width: `${stat.needsImprovementPercent}%` }}
                    />
                    <div
                      className="bg-red-500/60"
                      style={{ width: `${stat.poorPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Good {stat.goodPercent.toFixed(0)}%</span>
                    <span>Needs {stat.needsImprovementPercent.toFixed(0)}%</span>
                    <span>Poor {stat.poorPercent.toFixed(0)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <WebVitalsTable funnelId={funnelId} />
    </div>
  );
}
