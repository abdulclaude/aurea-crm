"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TopMicroConversionsProps {
  funnelId: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export function TopMicroConversions({ 
  funnelId, 
  startDate, 
  endDate,
  limit = 20 
}: TopMicroConversionsProps) {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.externalFunnels.getTopMicroConversions.queryOptions({
      funnelId,
      startDate,
      endDate,
      limit,
    })
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Micro-Conversions</CardTitle>
          <CardDescription>No micro-conversion data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getConversionTrend = (rate: number) => {
    if (rate >= 15) return { icon: TrendingUp, color: 'text-green-500', label: 'High' };
    if (rate >= 8) return { icon: Minus, color: 'text-yellow-500', label: 'Medium' };
    return { icon: TrendingDown, color: 'text-red-500', label: 'Low' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Micro-Conversions</CardTitle>
        <CardDescription>
          Events that correlate most with conversions (min. 5 sessions)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((event: { eventName: string; category: string; description: string | null; totalOccurrences: number; uniqueSessions: number; avgValue: number; convertedSessions: number; conversionRate: number }, index: number) => {
            const trend = getConversionTrend(event.conversionRate);
            const TrendIcon = trend.icon;

            return (
              <div
                key={`${event.eventName}-${index}`}
                className="p-4 rounded-lg border border-white/5 hover:border-white/10 bg-white/2 hover:bg-white/5 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm truncate">{event.eventName}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 capitalize shrink-0">
                        {event.category}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {event.description}
                      </p>
                    )}
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{event.totalOccurrences.toLocaleString()} events</span>
                      <span>•</span>
                      <span>{event.uniqueSessions.toLocaleString()} sessions</span>
                      <span>•</span>
                      <span>Value: {event.avgValue}</span>
                    </div>
                  </div>

                  {/* Conversion Rate */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1">
                      <TrendIcon className={`w-4 h-4 ${trend.color}`} />
                      <span className={`text-lg font-bold ${trend.color}`}>
                        {event.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {event.convertedSessions} / {event.uniqueSessions} converted
                    </span>
                    <span className={`text-xs ${trend.color} font-medium`}>
                      {trend.label} Impact
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      event.conversionRate >= 15 ? 'bg-green-500' :
                      event.conversionRate >= 8 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(event.conversionRate * 5, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-white/5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">
                {data.filter((e: { conversionRate: number }) => e.conversionRate >= 15).length}
              </div>
              <div className="text-xs text-muted-foreground">High Impact</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {data.filter((e: { conversionRate: number }) => e.conversionRate >= 8 && e.conversionRate < 15).length}
              </div>
              <div className="text-xs text-muted-foreground">Medium Impact</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {data.filter((e: { conversionRate: number }) => e.conversionRate < 8).length}
              </div>
              <div className="text-xs text-muted-foreground">Low Impact</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
