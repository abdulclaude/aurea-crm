"use client";

import { format } from "date-fns";
import {
  Eye,
  MousePointerClick,
  ShoppingCart,
  CheckCircle2,
  Zap,
  Activity,
  Clock,
} from "lucide-react";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/ui/timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface JourneyEvent {
  id: string;
  timestamp: Date;
  eventName: string;
  pageUrl: string | null;
  pageTitle: string | null;
  properties: any;
  isConversion: boolean;
  revenue: any;
  webVitals: {
    lcp: number | null;
    inp: number | null;
    cls: number | null;
    fcp: number | null;
    ttfb: number | null;
    rating: string | null;
  };
}

interface VisitorJourneyTimelineProps {
  events: JourneyEvent[];
}

const getEventIcon = (eventName: string, isConversion: boolean) => {
  if (isConversion) return <ShoppingCart className="h-3 w-3 text-green-600" />;
  
  switch (eventName) {
    case "page_view":
      return <Eye className="h-3 w-3 text-blue-600" />;
    case "click":
    case "button_click":
      return <MousePointerClick className="h-3 w-3 text-purple-600" />;
    case "form_submit":
      return <CheckCircle2 className="h-3 w-3 text-orange-600" />;
    case "web_vital":
      return <Zap className="h-3 w-3 text-yellow-600" />;
    default:
      return <Activity className="h-3 w-3 text-gray-600" />;
  }
};

const getEventColor = (eventName: string, isConversion: boolean) => {
  if (isConversion) return "bg-green-600";
  
  switch (eventName) {
    case "page_view":
      return "bg-blue-600";
    case "click":
    case "button_click":
      return "bg-purple-600";
    case "form_submit":
      return "bg-orange-600";
    case "web_vital":
      return "bg-yellow-600";
    default:
      return "bg-gray-600";
  }
};

const getVitalBadgeVariant = (rating: string | null) => {
  switch (rating) {
    case "good":
      return "default";
    case "needs-improvement":
      return "secondary";
    case "poor":
      return "destructive";
    default:
      return "outline";
  }
};

const formatVitalValue = (name: string, value: number | null): string => {
  if (value === null) return "—";
  if (name === "cls") return value.toFixed(3);
  return `${Math.round(value)}ms`;
};

export function VisitorJourneyTimeline({ events }: VisitorJourneyTimelineProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No events recorded for this session</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Timeline orientation="vertical" className="w-full">
      {events.map((event, index) => (
        <TimelineItem key={event.id} step={index + 1}>
          <TimelineHeader>
            <TimelineDate>
              {format(new Date(event.timestamp), "MMM d, yyyy • h:mm:ss a")}
            </TimelineDate>
          </TimelineHeader>

          <TimelineIndicator className={getEventColor(event.eventName, event.isConversion)}>
            {getEventIcon(event.eventName, event.isConversion)}
          </TimelineIndicator>

          <TimelineContent>
            <div className="space-y-2">
              {/* Event Title */}
              <div className="flex items-center gap-2">
                <TimelineTitle>
                  {event.isConversion ? "Conversion" : event.eventName.replace(/_/g, " ")}
                </TimelineTitle>
                {event.isConversion && event.revenue && (
                  <Badge variant="default" className="bg-green-600">
                    ${Number(event.revenue).toFixed(2)}
                  </Badge>
                )}
              </div>

              {/* Page Info */}
              {event.pageUrl && (
                <div className="text-sm text-muted-foreground">
                  {event.pageTitle && <p className="font-medium">{event.pageTitle}</p>}
                  <p className="text-xs truncate">{event.pageUrl}</p>
                </div>
              )}

              {/* Core Web Vitals (if this is a web_vital event) */}
              {event.eventName === "web_vital" && event.webVitals && (
                <div className="mt-2 p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-3 w-3" />
                    <span className="text-xs font-medium">Core Web Vital</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {event.webVitals.lcp !== null && (
                      <div>
                        <span className="text-muted-foreground">LCP:</span>{" "}
                        <span className="font-medium">{formatVitalValue("lcp", event.webVitals.lcp)}</span>
                      </div>
                    )}
                    {event.webVitals.inp !== null && (
                      <div>
                        <span className="text-muted-foreground">INP:</span>{" "}
                        <span className="font-medium">{formatVitalValue("inp", event.webVitals.inp)}</span>
                      </div>
                    )}
                    {event.webVitals.cls !== null && (
                      <div>
                        <span className="text-muted-foreground">CLS:</span>{" "}
                        <span className="font-medium">{formatVitalValue("cls", event.webVitals.cls)}</span>
                      </div>
                    )}
                    {event.webVitals.fcp !== null && (
                      <div>
                        <span className="text-muted-foreground">FCP:</span>{" "}
                        <span className="font-medium">{formatVitalValue("fcp", event.webVitals.fcp)}</span>
                      </div>
                    )}
                    {event.webVitals.ttfb !== null && (
                      <div>
                        <span className="text-muted-foreground">TTFB:</span>{" "}
                        <span className="font-medium">{formatVitalValue("ttfb", event.webVitals.ttfb)}</span>
                      </div>
                    )}
                  </div>
                  {event.webVitals.rating && (
                    <Badge variant={getVitalBadgeVariant(event.webVitals.rating)} className="mt-2 text-xs">
                      {event.webVitals.rating}
                    </Badge>
                  )}
                </div>
              )}

              {/* Custom Event Properties */}
              {event.properties && Object.keys(event.properties).length > 0 && event.eventName !== "web_vital" && (
                <div className="mt-2 p-3 bg-muted/50 rounded-md">
                  <div className="text-xs font-medium mb-1">Event Data:</div>
                  <div className="space-y-1">
                    {Object.entries(event.properties).slice(0, 5).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="text-muted-foreground">{key}:</span>{" "}
                        <span className="font-medium">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session End Event */}
              {event.eventName === "session_end" && event.properties && (
                <div className="mt-2 p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs font-medium">Session Summary</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {event.properties.duration && (
                      <div>
                        <span className="text-muted-foreground">Duration:</span>{" "}
                        <span className="font-medium">{event.properties.duration}s</span>
                      </div>
                    )}
                    {event.properties.activeTime && (
                      <div>
                        <span className="text-muted-foreground">Active Time:</span>{" "}
                        <span className="font-medium">{event.properties.activeTime}s</span>
                      </div>
                    )}
                    {event.properties.engagementRate !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Engagement:</span>{" "}
                        <span className="font-medium">{event.properties.engagementRate.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TimelineContent>

          <TimelineSeparator />
        </TimelineItem>
      ))}
    </Timeline>
  );
}
