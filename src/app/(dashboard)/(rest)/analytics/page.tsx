"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Users, Workflow, TrendingUp, Activity, CheckCircle2, XCircle, Clock, DollarSign, Receipt, AlertCircle, Calendar } from "lucide-react";
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

  // Invoice analytics
  const { data: revenueOverview } = useQuery({
    ...trpc.invoiceAnalytics.getRevenueOverview.queryOptions(),
  });

  const { data: agingReport } = useQuery({
    ...trpc.invoiceAnalytics.getAgingReport.queryOptions(),
  });

  const { data: revenueTrends } = useQuery({
    ...trpc.invoiceAnalytics.getRevenueTrends.queryOptions({ months: 6 }),
  });

  const { data: topClients } = useQuery({
    ...trpc.invoiceAnalytics.getTopClients.queryOptions({ limit: 5 }),
  });

  const { data: statusBreakdown } = useQuery({
    ...trpc.invoiceAnalytics.getStatusBreakdown.queryOptions(),
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
          { id: "invoicing", label: "Invoicing" },
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

        {activeTab === "invoicing" && (
          <div className="space-y-4">
            {/* Revenue Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(revenueOverview?.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {revenueOverview?.totalInvoices ?? 0} invoices
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid Revenue</CardTitle>
                  <CheckCircle2 className="size-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${(revenueOverview?.paidRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {revenueOverview?.paidInvoices ?? 0} paid invoices
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                  <Clock className="size-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    ${(revenueOverview?.outstandingRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Not yet due
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <AlertCircle className="size-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ${(revenueOverview?.overdueRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {revenueOverview?.overdueInvoices ?? 0} overdue invoices
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Invoice Value</CardTitle>
                  <Receipt className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(revenueOverview?.averageInvoiceValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per invoice
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Payment Time</CardTitle>
                  <Calendar className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {revenueOverview?.averagePaymentTime ?? 0} days
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From issue to payment
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                  <TrendingUp className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {revenueOverview?.totalRevenue
                      ? ((revenueOverview.paidRevenue / revenueOverview.totalRevenue) * 100).toFixed(1)
                      : '0.0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Revenue collected
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Aging Report */}
            <Card>
              <CardHeader>
                <CardTitle>Aging Report</CardTitle>
                <CardDescription>Outstanding invoices grouped by age</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">Current (Not Due)</p>
                      <p className="text-xs text-green-700 dark:text-green-300">{agingReport?.current.count ?? 0} invoices</p>
                    </div>
                    <p className="text-lg font-bold text-green-900 dark:text-green-100">
                      ${(agingReport?.current.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                    <div>
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">1-30 Days Overdue</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">{agingReport?.days1to30.count ?? 0} invoices</p>
                    </div>
                    <p className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                      ${(agingReport?.days1to30.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                    <div>
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-100">31-60 Days Overdue</p>
                      <p className="text-xs text-orange-700 dark:text-orange-300">{agingReport?.days31to60.count ?? 0} invoices</p>
                    </div>
                    <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                      ${(agingReport?.days31to60.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">61-90 Days Overdue</p>
                      <p className="text-xs text-red-700 dark:text-red-300">{agingReport?.days61to90.count ?? 0} invoices</p>
                    </div>
                    <p className="text-lg font-bold text-red-900 dark:text-red-100">
                      ${(agingReport?.days61to90.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700">
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">90+ Days Overdue</p>
                      <p className="text-xs text-red-700 dark:text-red-300">{agingReport?.days90plus.count ?? 0} invoices</p>
                    </div>
                    <p className="text-lg font-bold text-red-900 dark:text-red-100">
                      ${(agingReport?.days90plus.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Trends and Top Clients */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>Monthly revenue over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {revenueTrends && revenueTrends.length > 0 ? (
                      revenueTrends.map((trend, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded border">
                          <span className="text-sm font-medium">{trend.month}</span>
                          <div className="text-right">
                            <p className="text-sm font-bold">
                              ${trend.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground">{trend.count} invoices</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Clients by Revenue</CardTitle>
                  <CardDescription>Your highest-value clients</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topClients && topClients.length > 0 ? (
                      topClients.map((client, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded border">
                          <div>
                            <p className="text-sm font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.invoiceCount} invoices</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">
                              ${client.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-green-600">
                              ${client.paidRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} paid
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No client data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Status Breakdown</CardTitle>
                <CardDescription>Overview of invoices by current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {statusBreakdown && statusBreakdown.length > 0 ? (
                    statusBreakdown.map((status, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-secondary/50">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{status.status}</p>
                          <span className="text-xs text-muted-foreground">{status.count}</span>
                        </div>
                        <p className="text-lg font-bold">
                          ${status.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {status.amountDue > 0 && (
                          <p className="text-xs text-muted-foreground">
                            ${status.amountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} due
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground col-span-full text-center py-8">No invoice data yet</p>
                  )}
                </div>
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
