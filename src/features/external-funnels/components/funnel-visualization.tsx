"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import * as React from "react";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ResponsiveSankey } from "@nivo/sankey";
import { TrendingDown, TrendingUp, Users, Target } from "lucide-react";

type FunnelVisualizationProps = {
  funnelId: string;
};

export function FunnelVisualization({ funnelId }: FunnelVisualizationProps) {
  const trpc = useTRPC();
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");
  const [eventType, setEventType] = React.useState<"page_view" | "all">("page_view");

  const { data } = useSuspenseQuery(
    trpc.externalFunnels.getFunnelFlow.queryOptions({
      funnelId,
      timeRange,
      eventType,
    })
  );

  const { nodes, links, metrics } = data || { nodes: [], links: [], metrics: null };

  // Transform data for Nivo Sankey
  const sankeyData = React.useMemo(() => {
    if (!nodes || !links || nodes.length === 0) {
      return { nodes: [], links: [] };
    }

    // Filter out circular/backward links to create a DAG (Directed Acyclic Graph)
    // Build a map of node indices based on their order
    const nodeIndices = new Map(nodes.map((n, i) => [n.id, i]));
    
    // Only keep links that go forward (source index < target index)
    const filteredLinks = links.filter((link) => {
      const sourceIdx = nodeIndices.get(link.source);
      const targetIdx = nodeIndices.get(link.target);
      return sourceIdx !== undefined && targetIdx !== undefined && sourceIdx < targetIdx;
    });

    // Nivo Sankey format (based on CodeSandbox example)
    return {
      nodes: nodes.map((node) => ({
        id: node.id,
        nodeColor: "hsl(var(--primary))",
      })),
      links: filteredLinks.map((link) => ({
        source: link.source,
        target: link.target,
        value: link.value,
      })),
    };
  }, [nodes, links]);

  // Calculate step-by-step drop-off
  const stepMetrics = React.useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    
    return nodes.slice(0, 10).map((node, index) => {
      const nextNode = nodes[index + 1];
      if (!nextNode) return null;
      
      const dropOff = node.count - nextNode.count;
      const dropOffRate = ((dropOff / node.count) * 100).toFixed(1);
      const retentionRate = (100 - parseFloat(dropOffRate)).toFixed(1);
      
      return {
        from: node.label,
        to: nextNode.label,
        started: node.count,
        continued: nextNode.count,
        dropOff,
        dropOffRate: parseFloat(dropOffRate),
        retentionRate: parseFloat(retentionRate),
      };
    }).filter(Boolean);
  }, [nodes]);

  return (
    <div className="space-y-6 pt-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">Funnel Visualization</h3>
          <p className="text-sm text-muted-foreground">
            See how users flow through your funnel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={eventType} onValueChange={(v) => setEventType(v as typeof eventType)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page_view" className="text-xs">Page Views</SelectItem>
              <SelectItem value="all" className="text-xs">All Events</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d" className="text-xs">Last 7 days</SelectItem>
              <SelectItem value="30d" className="text-xs">Last 30 days</SelectItem>
              <SelectItem value="90d" className="text-xs">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSessions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Unique user sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.convertedSessions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Completed funnel</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.conversionRate}%
              </div>
              <p className="text-xs text-muted-foreground">Successfully converted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drop-off Rate</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics.dropOffRate}%
              </div>
              <p className="text-xs text-muted-foreground">Did not convert</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sankey Diagram */}
      {sankeyData.nodes.length > 0 && sankeyData.links.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>User Flow</CardTitle>
            <CardDescription>
              Visualize how users navigate through your funnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 500 }}>
              <ResponsiveSankey
                data={sankeyData}
                margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
                align="justify"
                colors={{ scheme: "category10" }}
                nodeOpacity={1}
                nodeHoverOpacity={1}
                nodeThickness={18}
                nodeSpacing={24}
                nodeBorderWidth={0}
                nodeBorderColor={{
                  from: "color",
                  modifiers: [["darker", 0.8]],
                }}
                nodeBorderRadius={3}
                linkOpacity={0.5}
                linkHoverOpacity={0.6}
                linkContract={3}
                enableLinkGradient={true}
                labelPosition="outside"
                labelOrientation="vertical"
                labelPadding={16}
                labelTextColor={{
                  from: "color",
                  modifiers: [["darker", 1]],
                }}
                legends={[
                  {
                    anchor: "bottom-right",
                    direction: "column",
                    translateX: 130,
                    itemWidth: 100,
                    itemHeight: 14,
                    itemDirection: "right-to-left",
                    itemsSpacing: 2,
                    itemTextColor: "#999",
                    symbolSize: 14,
                    effects: [
                      {
                        on: "hover",
                        style: {
                          itemTextColor: "#000",
                        },
                      },
                    ],
                  },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No flow data yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              User flow data will appear here once you have enough sessions.
              Make sure your funnel is receiving events.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step-by-Step Breakdown */}
      {stepMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step-by-Step Analysis</CardTitle>
            <CardDescription>
              Detailed breakdown of user retention at each step
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stepMetrics.map((step: any, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">
                      Step {index + 1}: {step.from}
                      <span className="text-muted-foreground mx-2">→</span>
                      {step.to}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{step.started.toLocaleString()} started</span>
                      <span>•</span>
                      <span className="text-green-600">{step.continued.toLocaleString()} continued</span>
                      <span>•</span>
                      <span className="text-red-600">{step.dropOff.toLocaleString()} dropped off</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={step.retentionRate >= 50 ? "default" : "destructive"}
                      className="font-mono"
                    >
                      {step.retentionRate}% retained
                    </Badge>
                    <Badge variant="outline" className="font-mono">
                      {step.dropOffRate}% drop-off
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
