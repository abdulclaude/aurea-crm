"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Eye, DollarSign, Users, MapPin, Globe } from "lucide-react";
import { format } from "date-fns";

type RealtimeEvent = {
  id: string;
  eventName: string;
  pagePath: string | null;
  pageTitle: string | null;
  userId: string | null;
  anonymousId: string | null;
  deviceType: string | null;
  browserName: string | null;
  countryCode: string | null;
  city: string | null;
  isConversion: boolean;
  revenue: number | null;
  timestamp: Date;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

type RealtimeDashboardProps = {
  funnelId: string;
};

export function RealtimeDashboard({ funnelId }: RealtimeDashboardProps) {
  const [events, setEvents] = React.useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const [stats, setStats] = React.useState({
    totalEvents: 0,
    conversions: 0,
    activeUsers: 0,
    revenue: 0,
  });
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const feedContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Connect to SSE endpoint
  React.useEffect(() => {
    const eventSource = new EventSource(
      `/api/external-funnels/${funnelId}/realtime`
    );
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log("Real-time connection established");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          setIsConnected(true);
        } else if (data.type === "events" && data.events) {
          // Add new events to the top of the list
          setEvents((prev) => {
            const newEvents = data.events.map((e: any) => ({
              ...e,
              timestamp: new Date(e.timestamp),
            }));
            
            // Create a Set of existing event IDs to prevent duplicates
            const existingIds = new Set(prev.map(e => e.id));
            
            // Filter out duplicates and scroll events (optional)
            const uniqueNewEvents = newEvents.filter((e: any) => 
              !existingIds.has(e.id) && e.eventName !== 'scroll_depth'
            );
            
            // Keep only last 50 events
            const combined = [...uniqueNewEvents, ...prev];
            
            // Scroll to top when new events arrive
            if (uniqueNewEvents.length > 0) {
              setTimeout(() => {
                feedContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }, 100);
            }
            
            return combined.slice(0, 50);
          });

          // Update stats
          setStats((prev) => {
            const newConversions = data.events.filter((e: any) => e.isConversion).length;
            const newRevenue = data.events.reduce(
              (sum: number, e: any) => sum + (e.revenue || 0),
              0
            );
            const uniqueUsers = new Set(
              data.events.map((e: any) => e.userId || e.anonymousId)
            );

            return {
              totalEvents: prev.totalEvents + data.events.length,
              conversions: prev.conversions + newConversions,
              activeUsers: uniqueUsers.size,
              revenue: prev.revenue + newRevenue,
            };
          });
        } else if (data.type === "heartbeat") {
          // Keep connection alive
          console.log("Heartbeat received");
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.error("Real-time connection error");
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [funnelId]);

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">Real-time Activity</h3>
          <p className="text-sm text-muted-foreground">
            Live stream of events as they happen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            } animate-pulse`}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? "Live" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events (Session)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Since connection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.conversions}
            </div>
            <p className="text-xs text-muted-foreground">This session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.revenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">This session</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Live Event Feed</CardTitle>
          <CardDescription>
            Real-time stream of user activity (last 50 events)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {isConnected ? "Waiting for events..." : "Connecting..."}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {isConnected
                  ? "New events will appear here in real-time as users interact with your funnel."
                  : "Establishing connection to the real-time server..."}
              </p>
            </div>
          ) : (
            <div ref={feedContainerRef} className="space-y-2 max-h-[600px] overflow-y-auto">
              {events.map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                    event.isConversion
                      ? "border-green-500 bg-green-500/5"
                      : "border-border"
                  } animate-in fade-in slide-in-from-top-2 duration-300`}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`flex items-center justify-center h-10 w-10 rounded-full ${
                        event.isConversion
                          ? "bg-green-500/10"
                          : "bg-primary/10"
                      }`}
                    >
                      {event.isConversion ? (
                        <DollarSign className="h-5 w-5 text-green-600" />
                      ) : event.eventName === "page_view" ? (
                        <Eye className="h-5 w-5 text-primary" />
                      ) : (
                        <Activity className="h-5 w-5 text-primary" />
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={event.isConversion ? "default" : "outline"}
                          className="text-xs"
                        >
                          {event.isConversion ? "Conversion" : event.eventName}
                        </Badge>
                        {event.revenue && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            ${event.revenue.toFixed(2)}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(event.timestamp, "HH:mm:ss")}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-medium">
                          {event.pageTitle || event.pagePath || "—"}
                        </span>

                        {event.deviceType && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{event.deviceType}</span>
                          </>
                        )}

                        {(event.city || event.countryCode) && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.city || event.countryCode}
                            </span>
                          </>
                        )}

                        {(event.utmSource || event.utmMedium) && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {event.utmSource || event.utmMedium}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* User ID */}
                  <div className="text-xs text-muted-foreground">
                    {event.userId?.substring(0, 12) ||
                      event.anonymousId?.substring(0, 12) ||
                      "Anonymous"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
