"use client";

import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { motion, useInView } from "framer-motion";

type EventCategoryPerformanceProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

const CATEGORY_COLORS: Record<string, string> = {
  viewing: "rgba(59, 130, 246, 1)",
  engagement: "rgba(168, 85, 247, 1)",
  high_engagement: "rgba(236, 72, 153, 1)",
  intent: "rgba(249, 115, 22, 1)",
  conversion: "rgba(34, 197, 94, 1)",
  session: "rgba(6, 182, 212, 1)",
  performance: "rgba(234, 179, 8, 1)",
  custom: "rgba(99, 102, 241, 1)",
  uncategorized: "rgba(107, 114, 128, 1)",
};

const CATEGORY_LABELS: Record<string, string> = {
  viewing: "Viewing",
  engagement: "Engagement",
  high_engagement: "High Engagement",
  intent: "Intent",
  conversion: "Conversion",
  session: "Session",
  performance: "Performance",
  custom: "Custom",
  uncategorized: "Uncategorized",
};

export function EventCategoryPerformance({
  funnelId,
  timeRange,
}: EventCategoryPerformanceProps) {
  const trpc = useTRPC();
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const { data } = useSuspenseQuery({
    ...trpc.externalFunnels.getEventsTrend.queryOptions({
      funnelId,
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,  });

  const categoryData = React.useMemo(() => {
    const map = new Map<
      string,
      {
        category: string;
        total: number;
        events: { name: string; count: number }[];
      }
    >();

    for (const event of data.eventTypes) {
      const category = event.category || "uncategorized";
      if (!map.has(category)) {
        map.set(category, { category, total: 0, events: [] });
      }
      const entry = map.get(category)!;
      entry.total += event.count;
      entry.events.push({ name: event.eventName, count: event.count });
    }

    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        events: entry.events.sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.total - a.total);
  }, [data.eventTypes]);

  const overallTotal = categoryData.reduce((sum, item) => sum + item.total, 0);

  if (overallTotal === 0) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0">
        <CardHeader>
          <CardTitle className="text-sm">Category performance</CardTitle>
          <CardDescription className="text-xs">
            No categorized events for the selected time range
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card
      className="rounded-none shadow-none border-l-0 md:col-span-1 pb-0 h-full"
      ref={ref}
    >
      <CardHeader>
        <div>
          <CardTitle className="text-sm">Category performance</CardTitle>
          <CardDescription className="text-xs">
            {overallTotal.toLocaleString()} events across {categoryData.length}{" "}
            categories
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0 h-full">
        <Accordion type="single" collapsible>
          {categoryData.map((categoryItem, index) => {
            const color =
              CATEGORY_COLORS[categoryItem.category] ||
              CATEGORY_COLORS.uncategorized;
            const percent =
              overallTotal > 0 ? (categoryItem.total / overallTotal) * 100 : 0;
            const bgOpacity = Math.max(1 - index * 0.12, 0.4);

            return (
              <AccordionItem
                key={categoryItem.category}
                value={categoryItem.category}
              >
                <AccordionTrigger className="relative overflow-hidden rounded-none px-6 py-3 [&>svg]:self-center">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={isInView ? { width: `${percent}%` } : { width: 0 }}
                    transition={{
                      duration: 0.8,
                      delay: index * 0.05,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                    className="absolute inset-y-0 left-0"
                    style={{
                      backgroundColor: color.replace(
                        "1)",
                        `${bgOpacity * 0.12})`
                      ),
                    }}
                  />
                  <div className="relative flex w-full items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {CATEGORY_LABELS[categoryItem.category] ||
                          categoryItem.category}
                      </span>
                      <span className="text-xs text-primary/80">
                        {percent.toFixed(1)}% of events
                      </span>
                    </div>
                    <div className="text-sm font-semibold">
                      {categoryItem.total.toLocaleString()}
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="py-0 h-full">
                  <div className="space-y-0">
                    {categoryItem.events.map((event, eventIndex) => {
                      const eventPercent =
                        categoryItem.total > 0
                          ? (event.count / categoryItem.total) * 100
                          : 0;
                      const eventOpacity = Math.max(1 - eventIndex * 0.12, 0.4);

                      return (
                        <div
                          key={event.name}
                          className={cn(
                            "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                            eventIndex < categoryItem.events.length - 1 &&
                              "border-b border-border/50"
                          )}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={
                              isInView
                                ? { width: `${eventPercent}%` }
                                : { width: 0 }
                            }
                            transition={{
                              duration: 0.8,
                              delay: eventIndex * 0.05,
                              ease: [0.25, 0.1, 0.25, 1],
                            }}
                            className="absolute inset-y-0 left-0"
                            style={{
                              backgroundColor: color.replace(
                                "1)",
                                `${eventOpacity * 0.08})`
                              ),
                            }}
                          />

                          <div className="relative flex flex-col">
                            <span className="text-xs font-medium text-primary">
                              {event.name}
                            </span>
                            <span className="text-[11px] text-primary/75">
                              {eventPercent.toFixed(1)}% of category
                            </span>
                          </div>
                          <div className="relative text-right text-sm font-semibold">
                            {event.count.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
