"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebVitalsStatsProps {
  funnelId: string;
  timestampStart?: Date;
  timestampEnd?: Date;
}

// Web Vitals thresholds (in milliseconds for time-based, raw values for others)
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  INP: { good: 200, needsImprovement: 500 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
  FID: { good: 100, needsImprovement: 300 },
};

type MetricName = keyof typeof THRESHOLDS;

const getRating = (metric: string, value: number): "GOOD" | "NEEDS_IMPROVEMENT" | "POOR" => {
  const threshold = THRESHOLDS[metric as MetricName];
  if (!threshold) return "GOOD";
  
  if (value <= threshold.good) return "GOOD";
  if (value <= threshold.needsImprovement) return "NEEDS_IMPROVEMENT";
  return "POOR";
};

const getRatingColor = (rating: "GOOD" | "NEEDS_IMPROVEMENT" | "POOR") => {
  switch (rating) {
    case "GOOD":
      return "text-green-600 dark:text-green-400";
    case "NEEDS_IMPROVEMENT":
      return "text-yellow-600 dark:text-yellow-400";
    case "POOR":
      return "text-red-600 dark:text-red-400";
  }
};

const getRatingBgColor = (rating: "GOOD" | "NEEDS_IMPROVEMENT" | "POOR") => {
  switch (rating) {
    case "GOOD":
      return "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800/30";
    case "NEEDS_IMPROVEMENT":
      return "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/30";
    case "POOR":
      return "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800/30";
  }
};

const getRatingIcon = (rating: "GOOD" | "NEEDS_IMPROVEMENT" | "POOR") => {
  switch (rating) {
    case "GOOD":
      return <TrendingUp className="h-4 w-4" />;
    case "NEEDS_IMPROVEMENT":
      return <Minus className="h-4 w-4" />;
    case "POOR":
      return <TrendingDown className="h-4 w-4" />;
  }
};

const formatValue = (metric: string, value: number): string => {
  if (metric === "CLS") {
    return value.toFixed(3);
  }
  // Time-based metrics (ms to seconds)
  return `${(value / 1000).toFixed(2)}s`;
};

const getMetricDescription = (metric: string): string => {
  switch (metric) {
    case "LCP":
      return "Largest Contentful Paint";
    case "INP":
      return "Interaction to Next Paint";
    case "CLS":
      return "Cumulative Layout Shift";
    case "FCP":
      return "First Contentful Paint";
    case "TTFB":
      return "Time to First Byte";
    case "FID":
      return "First Input Delay";
    default:
      return metric;
  }
};

export function WebVitalsStats({ funnelId, timestampStart, timestampEnd }: WebVitalsStatsProps) {
  const trpc = useTRPC();

  const { data } = useQuery({
    ...trpc.webVitals.getWebVitalsStats.queryOptions({
      funnelId,
      timestampStart,
      timestampEnd,
    }),
    refetchInterval: 5000, // Poll every 5 seconds for updated stats
    staleTime: 0,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching (prevents skeleton flicker)
  });

  const stats = data?.stats || [];
  const passingRate = data?.passingRate || 0;
  const totalVitals = data?.totalVitals || 0;

  // Overall passing rate rating
  const passingRating = passingRate >= 75 ? "GOOD" : passingRate >= 50 ? "NEEDS_IMPROVEMENT" : "POOR";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* Overall Passing Rate Card */}
      <Card className={cn("border", getRatingBgColor(passingRating))}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Passing Rate</CardTitle>
          <Gauge className={cn("h-4 w-4", getRatingColor(passingRating))} />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", getRatingColor(passingRating))}>
            {passingRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalVitals} total measurements
          </p>
          <div className="flex items-center gap-1 mt-2">
            <div className={cn("flex items-center gap-1", getRatingColor(passingRating))}>
              {getRatingIcon(passingRating)}
              <span className="text-xs font-medium">
                {passingRating === "GOOD" ? "Excellent" : passingRating === "NEEDS_IMPROVEMENT" ? "Needs Work" : "Poor"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Metric Cards */}
      {stats.map((stat) => {
        const p75Rating = getRating(stat.metric, stat.p75);
        
        return (
          <Card key={stat.metric} className={cn("border", getRatingBgColor(p75Rating))}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.metric}
              </CardTitle>
              <div className={cn("flex items-center gap-1", getRatingColor(p75Rating))}>
                {getRatingIcon(p75Rating)}
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", getRatingColor(p75Rating))}>
                {formatValue(stat.metric, stat.p75)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {getMetricDescription(stat.metric)} (P75)
              </p>
              
              {/* Rating breakdown */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-600 dark:text-green-400">Good</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {stat.goodPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-yellow-600 dark:text-yellow-400">Needs Improvement</span>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">
                    {stat.needsImprovementPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-600 dark:text-red-400">Poor</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {stat.poorPercent.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Additional stats */}
              <div className="mt-3 pt-3 border-t border-current/10">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Avg</p>
                    <p className="font-medium">{formatValue(stat.metric, stat.avg)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">P90</p>
                    <p className="font-medium">{formatValue(stat.metric, stat.p90)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
