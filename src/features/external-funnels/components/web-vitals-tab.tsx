"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, XCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WebVitalsStats } from "./web-vitals-stats";
import { WebVitalsTable } from "./web-vitals-table";

interface WebVitalsTabProps {
  funnelId: string;
}

// Time period buttons
const TIME_PERIODS = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "180d", value: "180d" },
  { label: "365d", value: "365d" },
];

// Percentile tabs
const PERCENTILES = [
  { label: "p50", value: "p50" },
  { label: "p75", value: "p75" },
  { label: "p90", value: "p90" },
];

// Mock data - replace with real tRPC query
const webVitalsData = {
  passing: 3,
  total: 3,
  samples: 5342,
  metrics: [
    {
      name: "LCP",
      label: "Loading performance",
      value: 2.087,
      unit: "s",
      rating: "good" as const,
      description: "Largest Contentful Paint measures loading performance",
    },
    {
      name: "FCP",
      label: "Initial render",
      value: 1.435,
      unit: "s",
      rating: "good" as const,
      description: "First Contentful Paint measures time to first render",
    },
    {
      name: "CLS",
      label: "Visual stability",
      value: 0.0,
      unit: "",
      rating: "good" as const,
      description: "Cumulative Layout Shift measures visual stability",
    },
    {
      name: "INP",
      label: "Responsiveness",
      value: 120,
      unit: "ms",
      rating: "good" as const,
      description: "Interaction to Next Paint measures responsiveness",
    },
    {
      name: "TTFB",
      label: "Server speed",
      value: 548,
      unit: "ms",
      rating: "good" as const,
      description: "Time to First Byte measures server response time",
    },
    {
      name: "FPS",
      label: "Smoothness",
      value: 61,
      unit: "",
      rating: "good" as const,
      description: "Frames Per Second measures animation smoothness",
    },
  ],
};

// Gauge component for metrics
function MetricGauge({
  value,
  rating,
}: {
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}) {
  const circumference = 2 * Math.PI * 45;
  const progress = Math.min(value / 100, 1);
  const strokeDashoffset = circumference * (1 - progress);

  const color =
    rating === "good"
      ? "#22c55e"
      : rating === "needs-improvement"
        ? "#eab308"
        : "#ef4444";

  return (
    <svg width="120" height="120" className="mx-auto">
      {/* Background circle */}
      <circle
        cx="60"
        cy="60"
        r="45"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-muted/20"
      />
      {/* Progress circle */}
      <circle
        cx="60"
        cy="60"
        r="45"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        className="transition-all duration-500"
      />
    </svg>
  );
}

export function WebVitalsTab({ funnelId }: WebVitalsTabProps) {
  const [timePeriod, setTimePeriod] = useState("30d");
  const [percentile, setPercentile] = useState("p75");

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case "good":
        return <CheckCircle2 className="size-5 text-green-500" />;
      case "needs-improvement":
        return <AlertCircle className="size-5 text-yellow-500" />;
      case "poor":
        return <XCircle className="size-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "good":
        return "text-green-600";
      case "needs-improvement":
        return "text-yellow-600";
      case "poor":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Period Selection */}
      <div className="flex items-center gap-2">
        {TIME_PERIODS.map((period) => (
          <button
            key={period.value}
            onClick={() => setTimePeriod(period.value)}
            className={cn(
              "px-4 py-1.5 text-sm rounded-md transition-colors",
              timePeriod === period.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            {period.label}
          </button>
        ))}
        <button className="px-4 py-1.5 text-sm rounded-md bg-muted hover:bg-muted/80 text-muted-foreground flex items-center gap-1.5">
          <span>📅</span>
          <span>Nov 29 – Dec 29</span>
        </button>
      </div>

      {/* Summary Card */}
      <Card className="p-6 bg-background border-green-500/20 border-l-4 border-l-green-500">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="size-6 text-green-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {webVitalsData.passing}/{webVitalsData.total}
              </span>
              <span className="text-muted-foreground">Core Web Vitals passing</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              CLS ✓ · INP ✓ · LCP ✓ · {webVitalsData.samples.toLocaleString()} samples
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted-foreground">Percentile</span>
            {PERCENTILES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPercentile(p.value)}
                className={cn(
                  "px-3 py-1 text-sm rounded transition-colors",
                  percentile === p.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {webVitalsData.metrics.map((metric) => (
          <Card key={metric.name} className="p-6 bg-muted/30">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">{metric.name}</h3>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger>
                      <Info className="size-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{metric.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
              {getRatingIcon(metric.rating)}
            </div>

            {/* Gauge or value display */}
            <div className="mb-4">
              {metric.name === "FPS" ? (
                <MetricGauge value={metric.value} rating={metric.rating} />
              ) : (
                <div className="relative h-24 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold">
                      {metric.value}
                      <span className="text-2xl text-muted-foreground ml-1">
                        {metric.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center">
              <span
                className={cn(
                  "text-sm font-medium",
                  getRatingColor(metric.rating)
                )}
              >
                {metric.rating === "good"
                  ? "Good"
                  : metric.rating === "needs-improvement"
                    ? "Needs Improvement"
                    : "Poor"}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Performance Trend Chart Placeholder */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
        <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">
            Chart showing Google's threshold (75th percentile) values over time
          </p>
        </div>
      </Card>

      {/* Web Vitals Table with Filters */}
      <WebVitalsTable funnelId={funnelId} />
    </div>
  );
}
