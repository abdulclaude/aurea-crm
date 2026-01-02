"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";
import { Activity, TrendingUp, Zap, Eye, Clock, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PerformanceAnalyticsProps {
  funnelId: string;
}

// Create dates ONCE outside component - truly stable, never changes
const getPerformanceDates = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { startDate: start, endDate: end };
};

// Store dates globally - created once when module loads
const PERFORMANCE_DATES = getPerformanceDates();

const getVitalRating = (name: string, value: number | null): { rating: string; color: string } => {
  if (value === null) return { rating: "N/A", color: "text-muted-foreground" };

  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    INP: [200, 500],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };

  const [good, needsImprovement] = thresholds[name] || [0, 0];
  
  if (value <= good) return { rating: "Good", color: "text-green-600" };
  if (value <= needsImprovement) return { rating: "Needs Improvement", color: "text-yellow-600" };
  return { rating: "Poor", color: "text-red-600" };
};

const formatVitalValue = (name: string, value: number | null): string => {
  if (value === null) return "—";
  
  if (name === "CLS") {
    return value.toFixed(3); // CLS is a score, not milliseconds
  }
  
  return `${Math.round(value)}ms`;
};

export function PerformanceAnalytics({ funnelId }: PerformanceAnalyticsProps) {
  const trpc = useTRPC();

  // Use the global dates - created once when module loads, never changes
  const { startDate, endDate } = PERFORMANCE_DATES;

  const { data } = useSuspenseQuery(
    trpc.externalFunnels.getPerformanceAnalytics.queryOptions({
      funnelId,
      startDate,
      endDate,
    })
  );

  const overall = data?.overall || {
    avgLcp: null,
    avgInp: null,
    avgCls: null,
    avgFcp: null,
    avgTtfb: null,
    avgExperienceScore: null,
    totalSessions: 0,
  };

  const byDevice = data?.byDevice || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Performance Analytics</h2>
        <p className="text-muted-foreground">
          Core Web Vitals and user experience metrics (Last 7 days)
        </p>
      </div>

      {/* Experience Score */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Overall Experience Score
          </CardTitle>
          <CardDescription>
            Calculated from all Core Web Vitals metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold">
              {overall.avgExperienceScore || "—"}
            </span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Based on {overall.totalSessions} sessions
          </p>
          {overall.avgExperienceScore !== null && (
            <Badge
              variant={overall.avgExperienceScore >= 80 ? "default" : overall.avgExperienceScore >= 60 ? "secondary" : "destructive"}
              className="mt-2"
            >
              {overall.avgExperienceScore >= 80 ? "Excellent" : overall.avgExperienceScore >= 60 ? "Good" : "Needs Improvement"}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Core Web Vitals */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* LCP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              LCP
            </CardTitle>
            <CardDescription>Largest Contentful Paint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {formatVitalValue("LCP", overall.avgLcp)}
              </div>
              <Badge
                variant={getVitalRating("LCP", overall.avgLcp).rating === "Good" ? "default" : "destructive"}
                className={getVitalRating("LCP", overall.avgLcp).color}
              >
                {getVitalRating("LCP", overall.avgLcp).rating}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Good: ≤2.5s | Needs Improvement: ≤4.0s
              </p>
            </div>
          </CardContent>
        </Card>

        {/* INP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              INP
            </CardTitle>
            <CardDescription>Interaction to Next Paint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {formatVitalValue("INP", overall.avgInp)}
              </div>
              <Badge
                variant={getVitalRating("INP", overall.avgInp).rating === "Good" ? "default" : "destructive"}
                className={getVitalRating("INP", overall.avgInp).color}
              >
                {getVitalRating("INP", overall.avgInp).rating}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Good: ≤200ms | Needs Improvement: ≤500ms
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CLS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              CLS
            </CardTitle>
            <CardDescription>Cumulative Layout Shift</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {formatVitalValue("CLS", overall.avgCls)}
              </div>
              <Badge
                variant={getVitalRating("CLS", overall.avgCls).rating === "Good" ? "default" : "destructive"}
                className={getVitalRating("CLS", overall.avgCls).color}
              >
                {getVitalRating("CLS", overall.avgCls).rating}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Good: ≤0.1 | Needs Improvement: ≤0.25
              </p>
            </div>
          </CardContent>
        </Card>

        {/* FCP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              FCP
            </CardTitle>
            <CardDescription>First Contentful Paint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {formatVitalValue("FCP", overall.avgFcp)}
              </div>
              <Badge
                variant={getVitalRating("FCP", overall.avgFcp).rating === "Good" ? "default" : "destructive"}
                className={getVitalRating("FCP", overall.avgFcp).color}
              >
                {getVitalRating("FCP", overall.avgFcp).rating}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Good: ≤1.8s | Needs Improvement: ≤3.0s
              </p>
            </div>
          </CardContent>
        </Card>

        {/* TTFB */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              TTFB
            </CardTitle>
            <CardDescription>Time to First Byte</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {formatVitalValue("TTFB", overall.avgTtfb)}
              </div>
              <Badge
                variant={getVitalRating("TTFB", overall.avgTtfb).rating === "Good" ? "default" : "destructive"}
                className={getVitalRating("TTFB", overall.avgTtfb).color}
              >
                {getVitalRating("TTFB", overall.avgTtfb).rating}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Good: ≤800ms | Needs Improvement: ≤1.8s
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Device */}
      {byDevice.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Device</CardTitle>
            <CardDescription>
              Compare Core Web Vitals across different device types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {byDevice.map((device) => (
                <div key={device.device} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{device.device}</h3>
                    <Badge variant="outline">{device.sessions} sessions</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">LCP</p>
                      <p className="text-sm font-medium">
                        {device.avgLcp ? `${Math.round(device.avgLcp)}ms` : "—"}
                      </p>
                      {device.avgLcp && (
                        <Badge
                          variant="outline"
                          className={`text-xs mt-1 ${getVitalRating("LCP", device.avgLcp).color}`}
                        >
                          {getVitalRating("LCP", device.avgLcp).rating}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">INP</p>
                      <p className="text-sm font-medium">
                        {device.avgInp ? `${Math.round(device.avgInp)}ms` : "—"}
                      </p>
                      {device.avgInp && (
                        <Badge
                          variant="outline"
                          className={`text-xs mt-1 ${getVitalRating("INP", device.avgInp).color}`}
                        >
                          {getVitalRating("INP", device.avgInp).rating}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">CLS</p>
                      <p className="text-sm font-medium">
                        {device.avgCls ? device.avgCls.toFixed(3) : "—"}
                      </p>
                      {device.avgCls && (
                        <Badge
                          variant="outline"
                          className={`text-xs mt-1 ${getVitalRating("CLS", device.avgCls).color}`}
                        >
                          {getVitalRating("CLS", device.avgCls).rating}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Experience Score</p>
                      <p className="text-sm font-medium">
                        {device.avgExperienceScore || "—"}/100
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">About Core Web Vitals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Core Web Vitals</strong> are a set of metrics that Google uses to measure user experience and page performance. These metrics directly impact your SEO rankings.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>LCP</strong> - How fast your main content loads</li>
            <li><strong>INP</strong> - How responsive your page is to user interactions</li>
            <li><strong>CLS</strong> - How stable your page layout is (no jumping elements)</li>
            <li><strong>FCP</strong> - How fast the first content appears</li>
            <li><strong>TTFB</strong> - How fast your server responds</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
