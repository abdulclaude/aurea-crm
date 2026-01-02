"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page-tabs";
import { Activity, Users, TrendingUp, Globe, Eye, UserCircle, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EventsTable } from "./events-table";
import { SessionsTable } from "./sessions-table";
import { TrafficSourcesTable } from "./traffic-sources-table";
import { FunnelVisualization } from "./funnel-visualization";
import { RealtimeDashboard } from "./realtime-dashboard";
import { UTMAnalytics } from "./utm-analytics";
import { DeviceAnalytics } from "./device-analytics";
import { GeographyAnalytics } from "./geography-analytics";
import { VisitorProfiles } from "./visitor-profiles";
import { PerformanceAnalytics } from "./performance-analytics";
import { WebVitalsTab } from "./web-vitals-tab";

interface FunnelAnalyticsProps {
  funnelId: string;
}

const TABS = [
  { id: "events", label: "Events" },
  { id: "sessions", label: "Sessions" },
  { id: "visitors", label: "Visitors" },
  { id: "sources", label: "Traffic Sources" },
  { id: "devices", label: "Devices" },
  { id: "geography", label: "Geography" },
  { id: "performance", label: "Performance" },
  { id: "web-vitals", label: "Web Vitals" },
  { id: "funnel", label: "Funnel Flow" },
  { id: "utm", label: "UTM Analytics" },
  { id: "realtime", label: "Real-time" },
];

export function FunnelAnalytics({ funnelId }: FunnelAnalyticsProps) {
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = useState("events");

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Funnel Analytics</h1>
        <p className="text-muted-foreground">
          Track events, sessions, and conversions for your custom funnel
        </p>
      </div>

      {/* Page Tabs */}
      <PageTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "events" && <EventsTable funnelId={funnelId} />}

        {activeTab === "sessions" && <SessionsTable funnelId={funnelId} />}

        {activeTab === "visitors" && <VisitorProfiles funnelId={funnelId} />}

        {activeTab === "sources" && <TrafficSourcesTable funnelId={funnelId} />}

        {activeTab === "devices" && <DeviceAnalytics funnelId={funnelId} />}

        {activeTab === "geography" && (
          <GeographyAnalytics funnelId={funnelId} />
        )}

        {activeTab === "performance" && <PerformanceAnalytics funnelId={funnelId} />}

        {activeTab === "web-vitals" && <WebVitalsTab funnelId={funnelId} />}

        {activeTab === "funnel" && <FunnelVisualization funnelId={funnelId} />}

        {activeTab === "utm" && <UTMAnalytics funnelId={funnelId} />}

        {activeTab === "realtime" && <RealtimeDashboard funnelId={funnelId} />}
      </div>
    </div>
  );
}
