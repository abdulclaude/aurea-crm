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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Globe, MapPin } from "lucide-react";
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
  const [viewMode, setViewMode] = React.useState<"countries" | "cities">(
    "countries"
  );
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  // Get events data for selector
  const { data: eventsData } = useSuspenseQuery({
    ...trpc.externalFunnels.getEventsTrend.queryOptions({
      funnelId,
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,  });

  // Get geography breakdown for selected event
  const { data: geographyData } = useSuspenseQuery({
    ...trpc.externalFunnels.getEventGeography.queryOptions({
      funnelId,
      eventName: selectedEvent || undefined, // undefined = All Events
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,  });

  // Calculate trend (comparing top location vs rest)
  const trend = React.useMemo(() => {
    if (!geographyData) return 0;

    if (viewMode === "countries" && geographyData.countries.length === 0)
      return 0;
    if (viewMode === "cities" && geographyData.cities.length === 0) return 0;

    const topPercentage =
      viewMode === "countries"
        ? geographyData.countries[0]?.percentage || 0
        : geographyData.cities[0]?.percentage || 0;

    const totalLocations =
      viewMode === "countries"
        ? geographyData.totalCountries
        : geographyData.totalCities;

    const avgPercentage = 100 / totalLocations;

    // Positive trend = top location dominates (good for targeting)
    return topPercentage - avgPercentage;
  }, [geographyData, viewMode]);

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

    return <FlagComponent className="w-6 h-4 rounded-sm shadow-sm" />;
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

  const dataToDisplay =
    viewMode === "countries" ? geographyData.countries : geographyData.cities;

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
            {/* View Mode Toggle */}
            <div className="flex items-center gap-0 border rounded-md overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "text-xs h-8 !px-2 rounded-none",
                  viewMode === "countries" &&
                    "bg-sky-400 hover:bg-sky-500 text-white hover:text-white"
                )}
                onClick={() => setViewMode("countries")}
              >
                <Globe className="size-3.5" />
                Countries
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "text-xs !h-8 !px-2 rounded-none",
                  viewMode === "cities" &&
                    "bg-sky-400 hover:bg-sky-500 text-white hover:text-white"
                )}
                onClick={() => setViewMode("cities")}
              >
                <MapPin className="size-3.5" />
                Cities
              </Button>
            </div>

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
          {viewMode === "countries" ? (
            // Countries View
            <>
              {geographyData.countries.map((country, index) => {
                const opacity = 1 - index * 0.12; // Fade out as we go down

                return (
                  <div
                    key={country.countryCode}
                    className={cn(
                      "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                      index < geographyData.countries.length - 1 &&
                        "border-b border-border/50"
                    )}
                    style={{ opacity: Math.max(opacity, 0.4) }}
                  >
                    {/* Background fill based on percentage */}
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

                    {/* Content */}
                    <div className="relative flex items-center gap-3">
                      {/* Country Flag */}
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden",
                          getLocationColor(index)
                        )}
                      >
                        {getCountryFlag(country.countryCode)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {country.countryName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {country.percentage.toFixed(1)}% of total
                          {country.revenue > 0 &&
                            ` • $${country.revenue.toLocaleString()} revenue`}
                        </div>
                      </div>
                    </div>

                    <div className="relative text-right">
                      <div className="text-2xl font-bold font-mono">
                        {country.count.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            // Cities View
            <>
              {geographyData.cities.map((city, index) => {
                const opacity = 1 - index * 0.12; // Fade out as we go down

                return (
                  <div
                    key={`${city.city}-${city.countryName}`}
                    className={cn(
                      "relative flex items-center justify-between px-6 py-3 transition-all duration-150 hover:bg-accent/50 overflow-hidden",
                      index < geographyData.cities.length - 1 &&
                        "border-b border-border/50"
                    )}
                    style={{ opacity: Math.max(opacity, 0.4) }}
                  >
                    {/* Background fill based on percentage */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={
                        isInView
                          ? { width: `${city.percentage}%` }
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

                    {/* Content */}
                    <div className="relative flex items-center gap-3">
                      {/* City Icon */}
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg",
                          getLocationColor(index)
                        )}
                      >
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{city.city}</div>
                        <div className="text-xs text-muted-foreground">
                          {city.countryName} • {city.percentage.toFixed(1)}% of
                          total
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
            </>
          )}
        </div>

        {dataToDisplay.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No {viewMode === "countries" ? "country" : "city"} data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
