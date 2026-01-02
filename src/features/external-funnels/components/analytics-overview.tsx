"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Eye, DollarSign, Clock, TrendingUp } from "lucide-react";

interface AnalyticsOverviewProps {
  funnelId: string;
}

export function AnalyticsOverview({ funnelId }: AnalyticsOverviewProps) {
  const trpc = useTRPC();

  const { data: analyticsData } = useSuspenseQuery(
    trpc.externalFunnels.getAnalytics.queryOptions({
      funnelId,
      timeRange: "7d", // Last 7 days
    })
  );

  const stats = analyticsData?.stats || {
    totalEvents: 0,
    totalSessions: 0,
    totalPageViews: 0,
    totalConversions: 0,
    totalRevenue: 0,
    avgSessionDuration: 0,
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const statCards = [
    {
      title: "Total Events",
      value: stats.totalEvents.toLocaleString(),
      icon: Activity,
      description: "All tracked events",
    },
    {
      title: "Total Sessions",
      value: stats.totalSessions.toLocaleString(),
      icon: Eye,
      description: "Unique visitor sessions",
    },
    {
      title: "Page Views",
      value: stats.totalPageViews.toLocaleString(),
      icon: Users,
      description: "Total page views",
    },
    {
      title: "Conversions",
      value: stats.totalConversions.toLocaleString(),
      icon: TrendingUp,
      description: "Successful conversions",
    },
    {
      title: "Revenue",
      value: formatCurrency(Number(stats.totalRevenue)),
      icon: DollarSign,
      description: "Total revenue generated",
    },
    {
      title: "Avg. Session Duration",
      value: formatDuration(stats.avgSessionDuration),
      icon: Clock,
      description: "Average time per session",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
