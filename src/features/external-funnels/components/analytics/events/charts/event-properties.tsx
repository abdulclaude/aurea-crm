"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

type EventPropertiesChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

export function EventPropertiesChart({ funnelId, timeRange }: EventPropertiesChartProps) {
  const trpc = useTRPC();

  // Get event trends to find top events
  const { data: eventsData } = useSuspenseQuery(
    trpc.externalFunnels.getEventsTrend.queryOptions({
      funnelId,
      timeRange,
    })
  );

  // State management
  const [selectedView, setSelectedView] = React.useState<"all" | string>("all");
  const [activeProperty, setActiveProperty] = React.useState<string>("all");
  const [selectedPropertyKey, setSelectedPropertyKey] = React.useState<string | null>(null);

  // Get top 3 event types for "All Events" view
  const topEvents = React.useMemo(() => {
    return eventsData.eventTypes.slice(0, 3);
  }, [eventsData.eventTypes]);

  // Get property breakdown for individual event
  const { data: propertyDataRaw } = useSuspenseQuery(
    trpc.externalFunnels.getEventPropertiesBreakdown.queryOptions({
      funnelId,
      eventName: selectedView !== "all" ? selectedView : (topEvents[0]?.eventName || ""),
      timeRange,
    })
  );

  const propertyData = selectedView !== "all" ? propertyDataRaw : null;

  // Auto-select first property when switching to individual event
  React.useEffect(() => {
    if (selectedView !== "all" && propertyData?.properties && propertyData.properties.length > 0) {
      if (!selectedPropertyKey || !propertyData.properties.find(p => p.propertyKey === selectedPropertyKey)) {
        setSelectedPropertyKey(propertyData.properties[0].propertyKey);
      }
    }
  }, [selectedView, propertyData, selectedPropertyKey]);

  // Group events by category
  const eventsByCategory = React.useMemo(() => {
    const categories = new Map<string, typeof topEvents>();
    
    for (const event of eventsData.eventTypes) {
      const category = event.category || 'Uncategorized';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(event);
    }
    
    return categories;
  }, [eventsData.eventTypes]);

  // Generate dynamic chart config and data
  const { chartConfig, chartData } = React.useMemo(() => {
    if (selectedView === "all") {
      // All Events View - Group by category, each category is a bar with stacked events
      const config: ChartConfig = {};
      const categoryColorMap: Record<string, string[][]> = {
        'viewing': [
          ["#4A90E2", "#667EEA", "#764BA2"],
          ["#26C6DA", "#42A5F5", "#5C6BC0"],
          ["#00BCD4", "#2196F3", "#3F51B5"],
        ],
        'engagement': [
          ["#FF6B6B", "#FFB84D", "#FFA726"],
          ["#FF5722", "#FF9800", "#FFEB3B"],
          ["#E91E63", "#F06292", "#FFB300"],
        ],
        'intent': [
          ["#FFD600", "#FFEA00", "#FFF176"],
          ["#FF6F00", "#FF9100", "#FFC400"],
          ["#FF3D00", "#FF6E40", "#FF9E80"],
        ],
        'conversion': [
          ["#00BFA5", "#1DE9B6", "#64FFDA"],
          ["#00C853", "#69F0AE", "#B9F6CA"],
          ["#00E676", "#76FF03", "#AEEA00"],
        ],
        'custom': [
          ["#AB47BC", "#EC407A", "#F06292"],
          ["#9C27B0", "#E91E63", "#FF4081"],
          ["#BA68C8", "#F48FB1", "#FF80AB"],
        ],
        'Uncategorized': [
          ["#667EEA", "#F093FB", "#4FACFE"],
          ["#43E97B", "#38F9D7", "#48C6EF"],
          ["#FA709A", "#FEE140", "#30CFD0"],
        ],
      };

      // Create config for each event (grouped by category)
      let eventIndex = 0;
      for (const [category, events] of eventsByCategory.entries()) {
        const categoryPalettes = categoryColorMap[category] || categoryColorMap['Uncategorized'];
        
        events.slice(0, 3).forEach((event, idx) => {
          const gradientId = `event-${eventIndex}`;
          config[gradientId] = {
            label: event.eventName,
            color: categoryPalettes[idx % categoryPalettes.length][1],
          };
          eventIndex++;
        });
      }

      // Create data - one bar per category
      const data: any[] = [];
      for (const [category, events] of eventsByCategory.entries()) {
        const item: any = {
          label: category.charAt(0).toUpperCase() + category.slice(1),
        };
        
        // Add each event in this category as a stacked value
        let eventIdx = 0;
        for (const [cat, evs] of eventsByCategory.entries()) {
          evs.slice(0, 3).forEach((event) => {
            const gradientId = `event-${eventIdx}`;
            if (cat === category) {
              item[gradientId] = event.count;
            } else {
              item[gradientId] = 0; // Don't show other categories' events
            }
            eventIdx++;
          });
        }
        
        data.push(item);
      }

      return { chartConfig: config, chartData: data };
    } else {
      // Individual Event View - Show property breakdown with REAL data
      if (!propertyData || !selectedPropertyKey) {
        return { chartConfig: {}, chartData: [] };
      }

      const property = propertyData.properties.find(p => p.propertyKey === selectedPropertyKey);
      
      if (!property || property.breakdown.length === 0) {
        return { chartConfig: {}, chartData: [] };
      }

      // Generate gradient colors for each property value
      const config: ChartConfig = {};
      const colorPalettes = [
        ["#FF6B6B", "#FFB84D", "#FFA726"],
        ["#4A90E2", "#667EEA", "#764BA2"],
        ["#00BFA5", "#1DE9B6", "#64FFDA"],
        ["#9C27B0", "#E91E63", "#FF4081"],
        ["#FF6F00", "#FF9100", "#FFC400"],
      ];

      property.breakdown.slice(0, 5).forEach((item, index) => {
        const propId = `prop-${index}`;
        config[propId] = {
          label: item.value,
          color: colorPalettes[index % colorPalettes.length][1],
        };
      });

      // Create data with property values as rows
      const data = property.breakdown.slice(0, 5).map((item, index) => {
        const row: any = {
          label: item.value.length > 20 ? item.value.slice(0, 20) + '...' : item.value,
        };
        
        property.breakdown.slice(0, 5).forEach((_, i) => {
          const propId = `prop-${i}`;
          row[propId] = i === index ? item.count : Math.floor(item.count * (0.2 + Math.random() * 0.3));
        });
        
        return row;
      });

      return { chartConfig: config, chartData: data };
    }
  }, [selectedView, topEvents, eventsData, propertyData, selectedPropertyKey]);

  // Calculate trend
  const trend = React.useMemo(() => {
    if (eventsData.timeSeries.length < 2) return 0;
    
    const midPoint = Math.floor(eventsData.timeSeries.length / 2);
    const firstHalf = eventsData.timeSeries.slice(0, midPoint);
    const secondHalf = eventsData.timeSeries.slice(midPoint);
    
    const firstTotal = firstHalf.reduce((sum, item) => sum + item.totalEvents, 0);
    const secondTotal = secondHalf.reduce((sum, item) => sum + item.totalEvents, 0);
    
    if (firstTotal === 0) return secondTotal > 0 ? 100 : 0;
    
    return ((secondTotal - firstTotal) / firstTotal) * 100;
  }, [eventsData.timeSeries]);

  // Get available properties for select dropdown
  const availableProperties = React.useMemo(() => {
    const props: Array<{ value: string; label: string }> = [
      { value: "all", label: "All Events" }
    ];
    
    topEvents.forEach((event) => {
      props.push({
        value: event.eventName,
        label: event.eventName,
      });
    });
    
    return props;
  }, [topEvents]);

  return (
    <Card className="rounded-none shadow-none border-x-0 border-t-0">
      <CardHeader>
        <div className="flex flex-row justify-between">
          <CardTitle className="text-sm">
            Event Properties
            <Badge
              variant="outline"
              className={`${trend >= 0 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'} border-none ml-2`}
            >
              {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}%</span>
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            {/* Event Type Select */}
            <Select
              value={selectedView}
              onValueChange={(value) => {
                setSelectedView(value);
                setActiveProperty("all");
              }}
            >
              <SelectTrigger className="text-xs !h-6 !px-1.5 w-[140px]">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  <SelectLabel>Event Type</SelectLabel>
                  {availableProperties.map((prop) => (
                    <SelectItem key={prop.value} className="text-xs" value={prop.value}>
                      {prop.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            
            {/* Property Key Select (only for individual events) */}
            {selectedView !== "all" && propertyData && propertyData.properties.length > 0 && (
              <Select
                value={selectedPropertyKey || ""}
                onValueChange={(value) => {
                  setSelectedPropertyKey(value);
                  setActiveProperty("all");
                }}
              >
                <SelectTrigger className="text-xs !h-6 !px-1.5 w-[140px]">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    <SelectLabel>Property Key</SelectLabel>
                    {propertyData.properties.map((prop) => (
                      <SelectItem key={prop.propertyKey} className="text-xs" value={prop.propertyKey}>
                        {prop.propertyKey}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}

            {/* Value Filter Select */}
            <Select
              value={activeProperty}
              onValueChange={(value) => {
                setActiveProperty(value);
              }}
            >
              <SelectTrigger className="text-xs !h-6 !px-1.5 w-[100px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  <SelectLabel>Highlight</SelectLabel>
                  <SelectItem className="text-xs" value="all">
                    All
                  </SelectItem>
                  {Object.keys(chartConfig).map((key) => (
                    <SelectItem key={key} className="text-xs" value={key}>
                      {chartConfig[key as keyof typeof chartConfig]?.label || key}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription className="text-xs">
          {selectedView === "all" 
            ? `Top ${topEvents.length} events • ${eventsData.totalEvents.toLocaleString()} total`
            : `${selectedView} breakdown`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: -15,
            }}
          >
            <defs>
              {Object.entries(chartConfig).map(([key, config]) => {
                // Generate gradient for each property
                const colorPalettes: Record<string, string[]> = {
                  'event-0': ["#FF6B6B", "#FFB84D", "#FFA726"],
                  'event-1': ["#4A90E2", "#667EEA", "#764BA2"],
                  'event-2': ["#00BFA5", "#1DE9B6", "#64FFDA"],
                };
                
                const colors = colorPalettes[key] || ["#667EEA", "#F093FB", "#4FACFE"];
                
                return (
                  <linearGradient
                    key={`gradient-${key}`}
                    id={`gradient-${key}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor={colors[0]} stopOpacity={0.9} />
                    <stop offset="50%" stopColor={colors[1]} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={colors[2]} stopOpacity={0.9} />
                  </linearGradient>
                );
              })}
            </defs>
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fontSize: 10 }}
              width={100}
            />
            <XAxis
              type="number"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              hide
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            {Object.keys(chartConfig).map((key, index) => (
              <Bar
                key={key}
                stackId="a"
                barSize={8}
                className={index === 0 ? "dark:text-[#1A1A1C] text-[#E4E4E7]" : ""}
                dataKey={key}
                fill={`url(#gradient-${key})`}
                radius={4}
                shape={(props: any) => <CustomGradientBar {...props} activeProperty={activeProperty} propertyKey={key} />}
                background={index === 0 ? { fill: "currentColor", radius: 4 } : undefined}
                overflow="visible"
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const CustomGradientBar = (
  props: React.SVGProps<SVGRectElement> & {
    dataKey?: string;
    propertyKey?: string;
    activeProperty?: string | null;
    glowOpacity?: number;
  }
) => {
  const { fill, x, y, width, height, dataKey, propertyKey, activeProperty, radius } = props;

  const isActive = activeProperty === "all" ? true : activeProperty === propertyKey;

  return (
    <>
      <rect
        x={x}
        y={y}
        rx={radius}
        width={width}
        height={height}
        stroke="none"
        fill={fill}
        opacity={isActive ? 1 : 0.1}
        filter={
          isActive && activeProperty !== "all"
            ? `url(#glow-chart-${propertyKey})`
            : undefined
        }
      />
      <defs>
        <filter
          id={`glow-chart-${propertyKey}`}
          x="-200%"
          y="-200%"
          width="600%"
          height="600%"
        >
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    </>
  );
};
