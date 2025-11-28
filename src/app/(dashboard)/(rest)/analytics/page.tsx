"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Workflow, TrendingUp, Activity } from "lucide-react";

export default function AnalyticsPage() {
  const posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Optimization</h1>
        <p className="text-muted-foreground mt-2">
          Track user behavior, workflow performance, and optimize your CRM
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="contacts">Contacts & Deals</TabsTrigger>
          <TabsTrigger value="funnels">Funnels</TabsTrigger>
          <TabsTrigger value="user-behavior">User Behavior</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Loading...</div>
                <p className="text-xs text-muted-foreground">
                  All tracked events across your organization
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Loading...</div>
                <p className="text-xs text-muted-foreground">
                  Users active in the last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Workflow Executions</CardTitle>
                <Workflow className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Loading...</div>
                <p className="text-xs text-muted-foreground">
                  Total executions this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Loading...</div>
                <p className="text-xs text-muted-foreground">
                  Lead to deal conversion rate
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Recent events across your organization</CardDescription>
            </CardHeader>
            <CardContent>
              {posthogApiKey ? (
                <div className="h-[400px] rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    PostHog dashboard will be embedded here
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Go to PostHog dashboard and create a dashboard, then embed it here using
                    an iframe with your dashboard URL
                  </p>
                </div>
              ) : (
                <div className="h-[400px] rounded-md border p-4 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      PostHog is not configured. Add NEXT_PUBLIC_POSTHOG_KEY to your environment variables.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Performance</CardTitle>
              <CardDescription>Track execution success rates, duration, and failures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] rounded-md border p-4">
                <p className="text-sm text-muted-foreground">
                  Workflow analytics dashboard
                </p>
                <ul className="text-xs text-muted-foreground mt-4 space-y-2">
                  <li>• Track workflow_executed events</li>
                  <li>• Monitor success vs failure rates</li>
                  <li>• Analyze execution duration</li>
                  <li>• Identify bottlenecks</li>
                  <li>• Popular workflows by usage</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CRM Analytics</CardTitle>
              <CardDescription>Contact lifecycle, deal pipeline, and conversion metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] rounded-md border p-4">
                <p className="text-sm text-muted-foreground">
                  CRM analytics dashboard
                </p>
                <ul className="text-xs text-muted-foreground mt-4 space-y-2">
                  <li>• Contact creation trends</li>
                  <li>• Lifecycle stage movement</li>
                  <li>• Deal stage progression</li>
                  <li>• Win/loss analysis</li>
                  <li>• Revenue forecasting</li>
                  <li>• Lead scoring effectiveness</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnels</CardTitle>
              <CardDescription>Track user journeys and identify drop-off points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] rounded-md border p-4">
                <p className="text-sm text-muted-foreground">
                  Funnel analysis dashboard
                </p>
                <ul className="text-xs text-muted-foreground mt-4 space-y-2">
                  <li>• Form submission to contact creation</li>
                  <li>• Contact created → Deal created</li>
                  <li>• Deal created → Deal won</li>
                  <li>• Workflow trigger → Completion</li>
                  <li>• Custom funnel builder</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-behavior" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Behavior</CardTitle>
              <CardDescription>Understand how users interact with your CRM</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] rounded-md border p-4">
                <p className="text-sm text-muted-foreground">
                  User behavior analytics
                </p>
                <ul className="text-xs text-muted-foreground mt-4 space-y-2">
                  <li>• Page views and navigation paths</li>
                  <li>• Feature usage heatmaps</li>
                  <li>• Session recordings (if enabled)</li>
                  <li>• User retention cohorts</li>
                  <li>• Agency vs Client behavior</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Getting Started with Analytics</CardTitle>
          <CardDescription>How to make the most of your analytics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">1. Configure PostHog</h3>
            <p className="text-sm text-muted-foreground">
              Create a PostHog account at posthog.com and add your API key to NEXT_PUBLIC_POSTHOG_KEY
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">2. Create Dashboards</h3>
            <p className="text-sm text-muted-foreground">
              Build custom dashboards in PostHog and embed them here using iframes
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">3. Track Custom Events</h3>
            <p className="text-sm text-muted-foreground">
              Events are automatically tracked for workflows, contacts, deals, and user actions
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">4. Set Up Funnels</h3>
            <p className="text-sm text-muted-foreground">
              Create funnels in PostHog to track user journeys and identify optimization opportunities
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
