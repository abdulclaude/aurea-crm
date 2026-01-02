"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface CategoryAnalyticsProps {
  funnelId: string;
  startDate?: Date;
  endDate?: Date;
}

const COLORS = [
  '#3B82F6', // viewing - blue
  '#8B5CF6', // engagement - purple  
  '#EC4899', // intent - pink
  '#10B981', // conversion - green
  '#F59E0B', // custom - orange
  '#6366F1', // indigo
  '#EF4444', // red
];

export function CategoryAnalytics({ funnelId, startDate, endDate }: CategoryAnalyticsProps) {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.externalFunnels.getCategoryBreakdown.queryOptions({
      funnelId,
      startDate,
      endDate,
    })
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.categories.map((cat: { category: string; count: number; avgValue: number; totalSessions: number; convertedSessions: number; conversionRate: number }, index: number) => ({
      ...cat,
      fill: COLORS[index % COLORS.length],
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Categories</CardTitle>
          <CardDescription>No event data available for this period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Events</CardDescription>
            <CardTitle className="text-3xl">{data.totalEvents.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Categories</CardDescription>
            <CardTitle className="text-3xl">{data.categories.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Value</CardDescription>
            <CardTitle className="text-3xl">
              {(
                data.categories.reduce((sum: number, cat: { avgValue: number }) => sum + cat.avgValue, 0) /
                data.categories.length
              ).toFixed(1)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Category</CardDescription>
            <CardTitle className="text-3xl capitalize">
              {data.categories[0]?.category || 'N/A'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Event Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Event Distribution</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) =>
                    `${category}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {chartData.map((entry: { fill: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Rate by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate by Category</CardTitle>
            <CardDescription>Which categories lead to conversions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="category" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Legend />
                <Bar dataKey="conversionRate" fill="#10B981" name="CVR %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average Value by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Average Impact Value</CardTitle>
            <CardDescription>Impact score per category (0-100)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="category" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Legend />
                <Bar dataKey="avgValue" fill="#8B5CF6" name="Avg Value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Session Count by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions by Category</CardTitle>
            <CardDescription>Unique sessions that triggered each category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="category" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Legend />
                <Bar dataKey="totalSessions" fill="#3B82F6" name="Sessions" />
                <Bar dataKey="convertedSessions" fill="#10B981" name="Converted" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
          <CardDescription>Complete breakdown of all event categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-medium">Category</th>
                  <th className="text-right p-2 font-medium">Events</th>
                  <th className="text-right p-2 font-medium">Sessions</th>
                  <th className="text-right p-2 font-medium">Conversions</th>
                  <th className="text-right p-2 font-medium">CVR</th>
                  <th className="text-right p-2 font-medium">Avg Value</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((category: { category: string; count: number; avgValue: number; totalSessions: number; convertedSessions: number; conversionRate: number }, index: number) => (
                  <tr 
                    key={category.category} 
                    className="border-b border-border hover:bg-white/5 transition"
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="capitalize font-medium">{category.category}</span>
                      </div>
                    </td>
                    <td className="text-right p-2">{category.count.toLocaleString()}</td>
                    <td className="text-right p-2">{category.totalSessions.toLocaleString()}</td>
                    <td className="text-right p-2">{category.convertedSessions.toLocaleString()}</td>
                    <td className="text-right p-2">
                      <span className={`${
                        category.conversionRate > 10 ? 'text-green-500' :
                        category.conversionRate > 5 ? 'text-yellow-500' :
                        'text-red-500'
                      } font-semibold`}>
                        {category.conversionRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right p-2">
                      <span className="text-muted-foreground">
                        {category.avgValue.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
