"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Users, Workflow, TrendingUp, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const trpc = useTRPC();

  // Fetch analytics data from the new analytics router
  const { data: workflowAnalytics } = useQuery({
    ...trpc.analytics.getWorkflowAnalytics.queryOptions(),
  });

  const { data: contactAnalytics } = useQuery({
    ...trpc.analytics.getContactAnalytics.queryOptions(),
  });

  const { data: dealAnalytics } = useQuery({
    ...trpc.analytics.getDealAnalytics.queryOptions(),
  });

  const { data: userBehaviorAnalytics } = useQuery({
    ...trpc.analytics.getUserBehaviorAnalytics.queryOptions(),
  });

  // Fallback to old data sources for compatibility
  const { data: contactsCount } = useQuery({
    ...trpc.contacts.count.queryOptions(),
  });

  return (
    <div className="space-y-0">
      <div className="p-6 pb-6">
        <h1 className="text-lg font-semibold text-primary">Analytics & Optimization</h1>
        <p className="text-xs text-primary/75">
          Track user behavior, workflow performance, and optimize your CRM
        </p>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "workflows", label: "Workflows" },
          { id: "contacts", label: "Contacts" },
          { id: "deals", label: "Deals" },
          { id: "user-behavior", label: "User Behaviour" },
          { id: "funnels", label: "Funnels" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      <div className="p-6 space-y-6">
        {activeTab === "overview" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
                <Workflow className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workflowAnalytics?.totalExecuted ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {workflowAnalytics?.successRate ? `${workflowAnalytics.successRate.toFixed(1)}% success rate` : 'No executions yet'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contactsCount ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active contacts in system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dealAnalytics?.totalCreated ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dealAnalytics?.wonCount ? `${dealAnalytics.wonCount} won` : 'No deals yet'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
                <Activity className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userBehaviorAnalytics?.totalActivities ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total activities logged
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "workflows" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
                  <BarChart3 className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workflowAnalytics?.totalExecuted ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    All time executions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <CheckCircle2 className="size-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {workflowAnalytics?.successRate ? `${workflowAnalytics.successRate.toFixed(1)}%` : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {workflowAnalytics?.successCount ?? 0} successful
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <XCircle className="size-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{workflowAnalytics?.failedCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Execution failures
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                  <Clock className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {workflowAnalytics?.avgDuration ? `${(workflowAnalytics.avgDuration / 1000).toFixed(1)}s` : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average execution time
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Performance</CardTitle>
                <CardDescription>Track execution success rates, duration, and failures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    Detailed workflow analytics and performance metrics
                  </p>
                  <ul className="text-xs text-muted-foreground mt-4 space-y-2">
                    <li>• Monitor success vs failure rates</li>
                    <li>• Analyze execution duration trends</li>
                    <li>• Identify bottlenecks in workflows</li>
                    <li>• Track popular workflows by usage</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                  <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{contactsCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    All contacts in system
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New This Month</CardTitle>
                  <TrendingUp className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">
                    Monthly growth
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Lead Score</CardTitle>
                  <BarChart3 className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">
                    Contact quality
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Contact Analytics</CardTitle>
                <CardDescription>Contact lifecycle, engagement, and conversion metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    Detailed contact analytics and lifecycle metrics
                  </p>
                  <ul className="text-xs text-muted-foreground mt-4 space-y-2">
                    <li>• Contact creation trends over time</li>
                    <li>• Lifecycle stage movement analysis</li>
                    <li>• Contact source attribution</li>
                    <li>• Engagement scoring</li>
                    <li>• Lead quality metrics</li>
                    <li>• Contact to deal conversion rates</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "deals" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
                  <TrendingUp className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dealAnalytics?.totalCreated ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    All deals created
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
                  <CheckCircle2 className="size-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{dealAnalytics?.wonCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Closed won
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lost Deals</CardTitle>
                  <XCircle className="size-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{dealAnalytics?.lostCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Closed lost
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <BarChart3 className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dealAnalytics?.winRate ? `${dealAnalytics.winRate.toFixed(1)}%` : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Conversion rate
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Deal Pipeline Analytics</CardTitle>
                <CardDescription>Deal progression, win rates, and revenue forecasting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    Detailed deal pipeline and revenue metrics
                  </p>
                  <ul className="text-xs text-muted-foreground mt-4 space-y-2">
                    <li>• Deal stage progression rates</li>
                    <li>• Win/loss analysis by stage</li>
                    <li>• Average deal cycle time</li>
                    <li>• Revenue forecasting and trends</li>
                    <li>• Deal velocity metrics</li>
                    <li>• Pipeline health indicators</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "user-behavior" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                  <Activity className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userBehaviorAnalytics?.totalActivities ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    All user activities
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Activity Types</CardTitle>
                  <BarChart3 className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(userBehaviorAnalytics?.activitiesByType ?? {}).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Different activity types
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                  <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userBehaviorAnalytics?.uniqueUsers ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Active users
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Behaviour</CardTitle>
                <CardDescription>Understand how users interact with your CRM</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    Detailed user behaviour analytics
                  </p>
                  <ul className="text-xs text-muted-foreground mt-4 space-y-2">
                    <li>• Page views and navigation paths</li>
                    <li>• Feature usage heatmaps</li>
                    <li>• Session recordings (if enabled)</li>
                    <li>• User retention cohorts</li>
                    <li>• Agency vs Client behaviour</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "funnels" && (
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnels</CardTitle>
              <CardDescription>Track conversion rates through your sales funnel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">
                  Funnel analytics dashboard
                </p>
                <ul className="text-xs text-muted-foreground mt-4 space-y-2">
                  <li>• Lead to contact conversion</li>
                  <li>• Contact to deal conversion</li>
                  <li>• Deal stage progression rates</li>
                  <li>• Drop-off analysis</li>
                  <li>• Optimization opportunities</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
