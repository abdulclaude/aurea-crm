"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import * as React from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import * as flags from "country-flag-icons/react/3x2";
import { motion, useInView } from "framer-motion";
import { Separator } from "@/components/ui/separator";

type EventGeographyChartProps = {
  funnelId: string;
  timeRange: "24h" | "7d" | "30d" | "90d";
};

export function EventGeographyChart({
  funnelId,
  timeRange,
}: EventGeographyChartProps) {
  const trpc = useTRPC();
  const [selectedEvent, setSelectedEvent] = React.useState<string | null>(null);
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  // Get events data for selector
  const { data: eventsData } = useSuspenseQuery({
    ...trpc.externalFunnels.getEventsTrend.queryOptions({
      funnelId,
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  // Get geography breakdown for selected event
  const { data: geographyData } = useSuspenseQuery({
    ...trpc.externalFunnels.getEventGeography.queryOptions({
      funnelId,
      eventName: selectedEvent || undefined, // undefined = All Events
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const eventGroups = React.useMemo(() => {
    const grouped = new Map<string, typeof eventsData.eventTypes>();
    for (const event of eventsData.eventTypes) {
      const category = event.category || "Uncategorized";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(event);
    }

    return Array.from(grouped.entries())
      .map(([category, events]) => ({
        category,
        events: events.sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [eventsData.eventTypes]);

  const selectedEventLabel =
    eventsData.eventTypes.find((event) => event.eventName === selectedEvent)
      ?.eventName || "All Events";

  if (!geographyData) {
    return (
      <Card className="rounded-none shadow-none border-x-0 border-t-0">
        <CardHeader>
          <CardTitle className="text-sm">Event locations</CardTitle>
          <CardDescription className="text-xs">Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Get flag component for country code
  const getCountryFlag = (countryCode: string) => {
    // Normalize country code to uppercase
    const code = countryCode.toUpperCase();

    // Map to flag component (e.g., "US" -> flags.US)
    const FlagComponent = (flags as any)[code];

    if (!FlagComponent) {
      // Fallback to generic globe icon if flag not found
      return <Globe className="w-6 h-4" />;
    }

    return <FlagComponent className="w-6 h-4 shadow-sm" />;
  };

  // Get color for each location based on ranking
  const getLocationColor = (index: number) => {
    const colors = [
      "bg-green-500/10 text-green-600 dark:text-green-400",
      "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    ];
    return colors[index % colors.length];
  };

  const getBackgroundColor = (index: number) => {
    const colors = [
      "bg-green-500/10",
      "bg-blue-500/10",
      "bg-purple-500/10",
      "bg-orange-500/10",
      "bg-pink-500/10",
    ];
    return colors[index % colors.length];
  };

  const citiesByCountry = React.useMemo(() => {
    const map = new Map<
      string,
      {
        countryCode: string;
        countryName: string;
        cities: typeof geographyData.cities;
      }
    >();

    for (const city of geographyData.cities) {
      const countryCode = city.countryCode || "Unknown";
      const countryName = city.countryName || countryCode;
      const key = `${countryCode}-${countryName}`;

      if (!map.has(key)) {
        map.set(key, {
          countryCode,
          countryName,
          cities: [],
        });
      }

      map.get(key)!.cities.push(city);
    }

    for (const entry of map.values()) {
      entry.cities.sort((a, b) => b.count - a.count);
    }

    return map;
  }, [geographyData.cities]);

  return (
    <Card
      className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-2 pb-0 gap-0"
      ref={ref}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Locations
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {/* Event Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="text-xs !h-8">
                  <span className="truncate">{selectedEventLabel}</span>
                  <ChevronDown className="ml-2 size-3.5 text-primary/60 dark:text-white/60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px] p-1">
                <DropdownMenuCheckboxItem
                  checked={selectedEvent === null}
                  onSelect={() => setSelectedEvent(null)}
                  className="text-xs"
                >
                  All Events
                </DropdownMenuCheckboxItem>
                {eventGroups.map((group) => (
                  <DropdownMenuSub key={group.category}>
                    <DropdownMenuSubTrigger className="text-xs">
                      {group.category}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-[240px] p-1 mr-2">
                      {group.events.map((event) => (
                        <DropdownMenuCheckboxItem
                          key={event.eventName}
                          checked={event.eventName === selectedEvent}
                          onSelect={() => setSelectedEvent(event.eventName)}
                          className="text-xs"
                        >
                          {event.eventName}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="px-0 py-0!">
        <div className="space-y-0">
          <Accordion type="single" collapsible>
            {geographyData.countries.map((country, index) => {
              const countryKey = `${country.countryCode}-${country.countryName}`;
              const cities =
                citiesByCountry.get(countryKey)?.cities ?? [];
              const countryTotal = country.count || 0;

              return (
                <AccordionItem key={countryKey} value={countryKey}>
                  <AccordionTrigger className="relative overflow-hidden rounded-none px-6 py-3 [&>svg]:self-center">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={
                        isInView
                          ? { width: `${country.percentage}%` }
                          : { width: 0 }
                      }
                      transition={{
                        duration: 0.8,
                        delay: index * 0.05,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                      className={cn(
                        "absolute inset-y-0 left-0",
                        getBackgroundColor(index)
                      )}
                    />
                    <div className="relative flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10">
                          {getCountryFlag(country.countryCode)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {country.countryName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {country.percentage.toFixed(1)}% of total
                            {country.revenue > 0 &&
                              ` • $${country.revenue.toLocaleString()} revenue`}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        {country.count.toLocaleString()}
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="py-0 h-full">
                    {cities.length === 0 ? (
                      <div className="px-6 py-3 text-xs text-muted-foreground">
                        No city data available
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {cities.map((city, cityIndex) => {
                          const indexOffset = cityIndex + index * 4;
                          const cityPercent =
                            countryTotal > 0
                              ? (city.count / countryTotal) * 100
                              : 0;
                          return (
                            <div
                              key={`${city.city}-${city.countryCode}`}
                              className={cn(
                                "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                                cityIndex < cities.length - 1 &&
                                  "border-b border-border/50"
                              )}
                            >
                              <motion.div
                                initial={{ width: 0 }}
                                animate={
                                  isInView
                                    ? { width: `${cityPercent}%` }
                                    : { width: 0 }
                                }
                                transition={{
                                  duration: 0.8,
                                  delay: indexOffset * 0.05,
                                  ease: [0.25, 0.1, 0.25, 1],
                                }}
                                className={cn(
                                  "absolute inset-y-0 left-0",
                                  getBackgroundColor(indexOffset)
                                )}
                              />

                              <div className="relative flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10">
                                  {getCountryFlag(city.countryCode)}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">
                                    {city.city}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {cityPercent.toFixed(1)}% of country
                                  </div>
                                </div>
                              </div>

                              <div className="relative text-right">
                                <div className="text-2xl font-bold font-mono">
                                  {city.count.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {geographyData.countries.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No country data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
