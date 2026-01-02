"use client";

import { Bar, BarChart, Cell, XAxis, ReferenceLine } from "recharts";
import React from "react";
import { AnimatePresence } from "motion/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { JetBrains_Mono } from "next/font/google";
import { useMotionValueEvent, useSpring } from "framer-motion";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const CHART_MARGIN = 35;

const chartConfig = {
  count: {
    label: "Events",
    color: "var(--secondary-foreground)",
  },
} satisfies ChartConfig;

type EventTypeChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

export function EventTypeChart({ funnelId, timeRange }: EventTypeChartProps) {
  const trpc = useTRPC();

  const { data } = useSuspenseQuery(
    trpc.externalFunnels.getEventsTrend.queryOptions({
      funnelId,
      timeRange,
    })
  );

  // Transform event types data for the chart
  const chartData = React.useMemo(() => {
    return data.eventTypes.map((event) => ({
      eventName: event.eventName,
      count: event.count,
    }));
  }, [data.eventTypes]);
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(
    undefined
  );

  // Generate random gradient colors based on event name (like visitor avatars)
  const getGradientColors = React.useCallback((eventName: string) => {
    const colorPalettes = [
      // Warm palettes
      ["#FF6B6B", "#FFB84D", "#FFA726"],
      ["#FF5722", "#FF9800", "#FFEB3B"],
      ["#E91E63", "#F06292", "#FFB300"],

      // Cool palettes
      ["#4A90E2", "#667EEA", "#764BA2"],
      ["#00BCD4", "#2196F3", "#3F51B5"],
      ["#26C6DA", "#42A5F5", "#5C6BC0"],

      // Purple/Pink palettes
      ["#AB47BC", "#EC407A", "#F06292"],
      ["#9C27B0", "#E91E63", "#FF4081"],
      ["#BA68C8", "#F48FB1", "#FF80AB"],

      // Green/Teal palettes
      ["#00BFA5", "#1DE9B6", "#64FFDA"],
      ["#00C853", "#69F0AE", "#B9F6CA"],
      ["#00E676", "#76FF03", "#AEEA00"],

      // Orange/Yellow palettes
      ["#FF6F00", "#FF9100", "#FFC400"],
      ["#FF3D00", "#FF6E40", "#FF9E80"],
      ["#FFD600", "#FFEA00", "#FFF176"],

      // Multi-color blends
      ["#667EEA", "#F093FB", "#4FACFE"],
      ["#43E97B", "#38F9D7", "#48C6EF"],
      ["#FA709A", "#FEE140", "#30CFD0"],
      ["#A8EDEA", "#FED6E3", "#C471F5"],
      ["#FFD89B", "#19547B", "#FF6B6B"],
    ];

    // Generate hash from event name
    let hash = 0;
    for (let i = 0; i < eventName.length; i++) {
      hash = (Math.imul(31, hash) + eventName.charCodeAt(i)) | 0;
    }
    hash = Math.abs(hash);

    const paletteIndex = hash % colorPalettes.length;
    const angle = hash % 360;

    return { colors: colorPalettes[paletteIndex], angle };
  }, []);

  const maxValueIndex = React.useMemo(() => {
    // if user is moving mouse over bar then set value to the bar value
    if (activeIndex !== undefined) {
      return {
        index: activeIndex,
        value: chartData[activeIndex]?.count || 0,
        eventName: chartData[activeIndex]?.eventName || "",
      };
    }
    // if no active index then set value to max value
    return chartData.reduce(
      (max, data, index) => {
        return data.count > max.value
          ? { index, value: data.count, eventName: data.eventName }
          : max;
      },
      { index: 0, value: 0, eventName: "" }
    );
  }, [activeIndex, chartData]);

  const activeGradient = React.useMemo(() => {
    if (maxValueIndex.eventName) {
      return getGradientColors(maxValueIndex.eventName);
    }
    return { colors: ["#667EEA", "#F093FB", "#4FACFE"], angle: 135 };
  }, [maxValueIndex.eventName, getGradientColors]);

  const maxValueIndexSpring = useSpring(maxValueIndex.value, {
    stiffness: 100,
    damping: 20,
  });

  const [springyValue, setSpringyValue] = React.useState(maxValueIndex.value);

  useMotionValueEvent(maxValueIndexSpring, "change", (latest) => {
    setSpringyValue(Number(latest.toFixed(0)));
  });

  React.useEffect(() => {
    maxValueIndexSpring.set(maxValueIndex.value);
  }, [maxValueIndex.value, maxValueIndexSpring]);

  return (
    <Card className="rounded-none shadow-none border-l-0 bg-transparent md:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className={cn(jetBrainsMono.className, "text-2xl tracking-tighter")}
          >
            {maxValueIndex.value.toLocaleString()}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            events
          </span>
        </CardTitle>
        <CardDescription>
          {maxValueIndex.eventName || "Top Event Type"}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <AnimatePresence mode="wait">
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={chartData}
              onMouseLeave={() => setActiveIndex(undefined)}
              margin={{
                left: CHART_MARGIN,
                bottom: 15,
              }}
            >
              <defs>
                <filter id="barGlow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient
                  id="activeBarGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                  gradientTransform={`rotate(${activeGradient.angle})`}
                >
                  <stop
                    offset="0%"
                    stopColor={activeGradient.colors[0]}
                    stopOpacity={1}
                  />
                  <stop
                    offset="50%"
                    stopColor={activeGradient.colors[1]}
                    stopOpacity={1}
                  />
                  <stop
                    offset="100%"
                    stopColor={activeGradient.colors[2]}
                    stopOpacity={1}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="eventName"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 10 }}
                tickFormatter={(value) =>
                  value.length > 12 ? value.slice(0, 12) + "..." : value
                }
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                {chartData.map((_, index) => (
                  <Cell
                    className="duration-200"
                    opacity={index === maxValueIndex.index ? 1 : 0.2}
                    fill={
                      index === maxValueIndex.index
                        ? "url(#activeBarGradient)"
                        : "var(--color-count)"
                    }
                    filter={
                      index === maxValueIndex.index
                        ? "url(#barGlow)"
                        : undefined
                    }
                    key={index}
                    onMouseEnter={() => setActiveIndex(index)}
                  />
                ))}
              </Bar>
              <ReferenceLine
                opacity={0.4}
                y={springyValue}
                stroke="var(--secondary-foreground)"
                strokeWidth={1}
                strokeDasharray="3 3"
                label={<CustomReferenceLabel value={maxValueIndex.value} />}
              />
            </BarChart>
          </ChartContainer>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

interface CustomReferenceLabelProps {
  viewBox?: {
    x?: number;
    y?: number;
  };
  value: number;
}

const CustomReferenceLabel: React.FC<CustomReferenceLabelProps> = (props) => {
  const { viewBox, value } = props;
  const x = viewBox?.x ?? 0;
  const y = viewBox?.y ?? 0;

  // we need to change width based on value length
  const width = React.useMemo(() => {
    const characterWidth = 8; // Average width of a character in pixels
    const padding = 10;
    return value.toString().length * characterWidth + padding;
  }, [value]);

  return (
    <>
      <rect
        x={x - CHART_MARGIN}
        y={y - 9}
        width={width}
        height={18}
        fill="var(--secondary-foreground)"
        rx={4}
      />
      <text
        fontWeight={600}
        x={x - CHART_MARGIN + 6}
        y={y + 4}
        fill="var(--primary-foreground)"
      >
        {value}
      </text>
    </>
  );
};
