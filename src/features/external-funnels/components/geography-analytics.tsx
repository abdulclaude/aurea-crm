"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { motion, useInView } from "framer-motion";
import {
  Map as MapView,
  MapControls,
  MapClusterLayer,
  MapPopup,
} from "@/components/ui/map";
import { getCountryCoordinates } from "@/features/external-funnels/hooks/use-analytics-overview";
import { Separator } from "@/components/ui/separator";
import { getDeviceIcon as getDeviceIconForType } from "@/constants/devices";
import { getBrowserIcon as getBrowserIconForType } from "@/constants/browsers";
import { getOsIcon as getOsIconForType } from "@/constants/os";
import { ChevronLeft, ChevronRight } from "lucide-react";

type GeographyAnalyticsProps = {
  funnelId: string;
};

// Convert country code to flag emoji
const getCountryFlag = (countryCode: string) => {
  if (!countryCode || countryCode === "Unknown" || countryCode.length !== 2) {
    return "🌍";
  }
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
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

const hashString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getJitteredCoordinates = (
  latitude: number,
  longitude: number,
  seed: string,
  radius: number
) => {
  const hash = hashString(seed);
  const latOffset = ((hash % 1000) / 1000 - 0.5) * radius;
  const lngOffset = (((hash / 1000) % 1000) / 1000 - 0.5) * radius;
  return {
    lat: latitude + latOffset,
    lng: longitude + lngOffset,
  };
};

const LOCATIONS_PER_PAGE = 6;

export function GeographyAnalytics({ funnelId }: GeographyAnalyticsProps) {
  const trpc = useTRPC();
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");
  const [locationsPage, setLocationsPage] = React.useState(1);

  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const { data } = useSuspenseQuery({
    ...trpc.externalFunnels.getGeographyAnalytics.queryOptions({
      funnelId,
      timeRange,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
  const totalCountryPages = Math.max(
    1,
    Math.ceil(data.countries.length / LOCATIONS_PER_PAGE)
  );

  React.useEffect(() => {
    setLocationsPage(1);
  }, [timeRange]);

  React.useEffect(() => {
    setLocationsPage((page) => Math.min(page, totalCountryPages));
  }, [totalCountryPages]);

  const paginatedCountries = React.useMemo(() => {
    const startIndex = (locationsPage - 1) * LOCATIONS_PER_PAGE;
    return data.countries.slice(startIndex, startIndex + LOCATIONS_PER_PAGE);
  }, [data.countries, locationsPage]);
  const topCountry = React.useMemo(() => {
    if (!data.countries.length) return null;
    return data.countries.reduce((top, current) => {
      if (!top) return current;
      return current.sessions > top.sessions ? current : top;
    }, data.countries[0]);
  }, [data.countries]);
  const topConversionCountry = React.useMemo(() => {
    if (!data.countries.length) return null;
    return data.countries.reduce((top, current) => {
      if (!top) return current;
      return current.conversions > top.conversions ? current : top;
    }, data.countries[0]);
  }, [data.countries]);



  // Session properties type for GeoJSON features
  type SessionProperties = {
    sessionId: string;
    countryCode: string;
    countryName: string;
    city: string;
    deviceType: string;
    browserName: string;
    osName: string;
    visitorDisplayName: string;
    firstSeen: string;
    totalSessions: number;
    eventsCount: number;
    firstSource: string | null;
    firstMedium: string | null;
    firstCampaign: string | null;
    firstReferrer: string | null;
  };

  // State for selected session popup
  const [selectedSession, setSelectedSession] = React.useState<{
    properties: SessionProperties;
    coordinates: [number, number];
  } | null>(null);

  const { data: sessionsData } = useSuspenseQuery(
    trpc.externalFunnels.getGeographySessions.queryOptions({
      funnelId,
      timeRange,
      limit: 2000,
    })
  );

  const filteredSessions = React.useMemo(
    () => sessionsData?.sessions || [],
    [sessionsData?.sessions]
  );
  type SessionLocation = (typeof filteredSessions)[number];

  const citiesByCountry = React.useMemo(() => {
    const map = new Map<
      string,
      {
        countryCode: string;
        countryName: string;
        cities: typeof data.cities;
      }
    >();

    for (const city of data.cities) {
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
      entry.cities.sort((a, b) => b.sessions - a.sessions);
    }

    return map;
  }, [data.cities]);

  const cityCoordsByKey = React.useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    for (const session of filteredSessions) {
      const city = session.city;
      if (!city) continue;
      const countryCode = session.countryCode || "Unknown";
      if (
        session.latitude != null &&
        session.longitude != null &&
        !(session.latitude === 0 && session.longitude === 0)
      ) {
        map.set(`${city}-${countryCode}`, {
          lat: session.latitude,
          lng: session.longitude,
        });
      }
    }
    return map;
  }, [filteredSessions]);



  // Convert sessions to GeoJSON FeatureCollection for clustering
  const sessionsGeoJSON = React.useMemo<
    GeoJSON.FeatureCollection<GeoJSON.Point, SessionProperties>
  >(() => {
    const features: GeoJSON.Feature<GeoJSON.Point, SessionProperties>[] = [];

    for (const session of filteredSessions) {
      const countryCode = session.countryCode || "Unknown";
      const city = session.city || "Unknown";

      const hasCoords =
        session.latitude != null &&
        session.longitude != null &&
        !(session.latitude === 0 && session.longitude === 0);

      const sessionCoords = hasCoords
        ? { lat: session.latitude!, lng: session.longitude! }
        : null;

      const cityCoords =
        !sessionCoords && city !== "Unknown"
          ? cityCoordsByKey.get(`${city}-${countryCode}`) || null
          : null;

      const baseCoords =
        sessionCoords || cityCoords || getCountryCoordinates(countryCode);

      if (baseCoords.lat == null || baseCoords.lng == null) continue;

      // Always apply jitter to prevent overlapping points
      // Use smaller jitter for exact coordinates, larger for city/country fallbacks
      const jitterRadius = sessionCoords
        ? 0.002 // ~200m for exact coordinates - enough to separate stacked points
        : cityCoords
          ? 0.08 // ~8km for city-level
          : 0.6; // ~60km for country-level

      const jittered = getJitteredCoordinates(
        baseCoords.lat,
        baseCoords.lng,
        session.sessionId,
        jitterRadius
      );

      const firstSeenValue = session.firstSeen || session.startedAt;

      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [jittered.lng, jittered.lat],
        },
        properties: {
          sessionId: session.sessionId,
          countryCode,
          countryName: session.countryName || countryCode,
          city,
          deviceType: session.deviceType || "Unknown",
          browserName: session.browserName || "Unknown",
          osName: session.osName || "Unknown",
          visitorDisplayName: session.visitorDisplayName || "Anonymous Visitor",
          firstSeen: format(new Date(firstSeenValue), "MMM d, yyyy"),
          totalSessions: session.totalSessions ?? 1,
          eventsCount:
            typeof session.eventsCount === "number"
              ? session.eventsCount
              : (session.pageViews ?? 0),
          firstSource: session.firstSource,
          firstMedium: session.firstMedium,
          firstCampaign: session.firstCampaign,
          firstReferrer: session.firstReferrer,
        },
      });
    }

    return {
      type: "FeatureCollection",
      features,
    };
  }, [filteredSessions, cityCoordsByKey]);

  // Handle point click - show popup with session details
  const handlePointClick = React.useCallback(
    (
      feature: GeoJSON.Feature<GeoJSON.Point, SessionProperties>,
      coordinates: [number, number]
    ) => {
      setSelectedSession({
        properties: feature.properties,
        coordinates,
      });
    },
    []
  );

  return (
    <div className="">
      {/* <div className="flex items-center justify-between">
        <Select
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as typeof timeRange)}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d" className="text-xs">
              Last 7 days
            </SelectItem>
            <SelectItem value="30d" className="text-xs">
              Last 30 days
            </SelectItem>
            <SelectItem value="90d" className="text-xs">
              Last 90 days
            </SelectItem>
          </SelectContent>
        </Select>
      </div> */}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-5">
        <Card className="ring-0 shadow-none border-y-0 rounded-none border-l-0 gap-2 justify-between">
          <CardHeader className="h-max">
            <CardDescription className="text-xs font-medium">
              Total countries
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="text-xl font-semibold">{data.countries.length}</div>
          </CardContent>
        </Card>

        <Card className="ring-0 shadow-none rounded-none border-none gap-2 justify-between">
          <CardHeader className="">
            <CardDescription className="text-xs font-medium">
              Total cities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{data.cities.length}</div>
          </CardContent>
        </Card>

        <Card className="ring-0 shadow-none border-y-0 rounded-none border-r-0 gap-2 justify-between">
          <CardHeader className="">
            <CardDescription className="text-xs font-medium">
              Top country by sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topCountry ? (
              <div className="text-xl font-medium">
                {getCountryFlag(topCountry.countryCode)}{" "}
                {topCountry.countryName}
              </div>
            ) : (
              <div className="text-xl font-semibold">0</div>
            )}
          </CardContent>
        </Card>

        <Card className="ring-0 shadow-none border-y-0 rounded-none gap-2 justify-between">
          <CardHeader className="">
            <CardDescription className="text-xs font-medium">
              Conversions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold text-green-600">113</div>
          </CardContent>
        </Card>

        <Card className="ring-0 shadow-none border-y-0 rounded-none gap-2 justify-between">
          <CardHeader className="">
            <CardDescription className="text-xs font-medium">
              Top country by conversions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.totalConversions === 0 ? (
              <div className="text-sm text-muted-foreground">
                No conversions have been made yet.
              </div>
            ) : topConversionCountry ? (
              <div className="space-y-1">
                <div className="text-xl font-medium">
                  {getCountryFlag(topConversionCountry.countryCode)}{" "}
                  {topConversionCountry.countryName}
                </div>
                <div className="text-xl font-semibold text-green-600">
                  {topConversionCountry.conversions.toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-xl font-semibold text-green-600">0</div>
            )}
          </CardContent>
        </Card>
      </div>

      {data.totalSessions === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary leading-4.5">
          No geography data found. <br /> Data will appear once sessions start
          coming in.
        </div>
      ) : (
        <div className="">
          <div className="w-full h-[calc(100vh-240px)] min-h-[520px] overflow-hidden mb-6">
            <MapView
              center={[0, 40]}
              zoom={2}
              minZoom={2}
              maxZoom={18}
              attributionControl={false}
            >
              <MapControls showZoom className="text-primary" />
              <MapClusterLayer<SessionProperties>
                data={sessionsGeoJSON}
                clusterMaxZoom={14}
                clusterRadius={60}
                clusterColors={["#10b981", "#0ea5e9", "#6366f1"]}
                clusterThresholds={[50, 200]}
                clusterSizes={[14, 18, 22]}
                pointColor="#10b981"
                pointRadius={5}
                showPingAnimation
                onPointClick={handlePointClick}
              />
              {selectedSession && (
                <SessionPopup
                  session={selectedSession.properties}
                  coordinates={selectedSession.coordinates}
                  onClose={() => setSelectedSession(null)}
                />
              )}
            </MapView>
          </div>

          <Card
            className="rounded-none shadow-none border-x-0 border-t-0 md:col-span-2 pb-0 gap-0"
            ref={ref}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm">Locations</CardTitle>
                  <CardDescription className="text-xs">
                    {data.totalSessions.toLocaleString()} sessions across{" "}
                    {data.countries.length} countries
                  </CardDescription>
                </div>
                {totalCountryPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        setLocationsPage((page) => Math.max(1, page - 1))
                      }
                      disabled={locationsPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {locationsPage} / {totalCountryPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        setLocationsPage((page) =>
                          Math.min(totalCountryPages, page + 1)
                        )
                      }
                      disabled={locationsPage === totalCountryPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="px-0 py-0">
              <Accordion type="single" collapsible>
                {paginatedCountries.map((country, index) => {
                  const indexOffset =
                    index + (locationsPage - 1) * LOCATIONS_PER_PAGE;
                  const countryKey = `${country.countryCode}-${country.countryName}`;
                  const cities = citiesByCountry.get(countryKey)?.cities ?? [];
                  const countrySessions = country.sessions || 0;

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
                            getBackgroundColor(indexOffset)
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
                              </span>
                            </div>
                          </div>
                          <div className="text-sm font-semibold">
                            {country.sessions.toLocaleString()}
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
                              const cityOffset = cityIndex + indexOffset * 4;
                              const cityPercent =
                                countrySessions > 0
                                  ? (city.sessions / countrySessions) * 100
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
                                      delay: 0,
                                      ease: [0.25, 0.1, 0.25, 1],
                                    }}
                                    className={cn(
                                      "absolute inset-y-0 left-0",
                                      getBackgroundColor(cityOffset)
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
                                      {city.sessions.toLocaleString()}
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Session popup component for displaying session details
function SessionPopup({
  session,
  coordinates,
  onClose,
}: {
  session: {
    sessionId: string;
    countryCode: string;
    countryName: string;
    city: string;
    deviceType: string;
    browserName: string;
    osName: string;
    visitorDisplayName: string;
    firstSeen: string;
    totalSessions: number;
    eventsCount: number;
    firstSource: string | null;
    firstMedium: string | null;
    firstCampaign: string | null;
    firstReferrer: string | null;
  };
  coordinates: [number, number];
  onClose: () => void;
}) {
  const sourceLabel = session.firstSource
    ? `${session.firstSource}${
        session.firstMedium ? ` / ${session.firstMedium}` : ""
      }${session.firstCampaign ? ` / ${session.firstCampaign}` : ""}`
    : session.firstReferrer || "Direct";

  const DeviceIcon = getDeviceIconForType(session.deviceType);
  const BrowserIcon = getBrowserIconForType(session.browserName);
  const OsIcon = getOsIconForType(session.osName);

  return (
    <MapPopup
      longitude={coordinates[0]}
      latitude={coordinates[1]}
      onClose={onClose}
      className="w-104 px-0 py-4"
      closeOnClick={false}
    >
      <div className="space-y-3 flex flex-col items-center">
        <div className="space-y-1 text-center">
          <div className="text-sm font-semibold">{session.visitorDisplayName}</div>
          <div className="text-xs text-muted-foreground">
            {getCountryFlag(session.countryCode)} {session.city}, {session.countryCode}
          </div>
        </div>

        <Separator />

        <div className="flex flex-col w-full gap-4 py-2">
          <div className="grid grid-cols-3 gap-2 text-xs justify-between w-full text-center px-8">
            <div className="space-y-1">
              <div className="text-muted-foreground">First seen</div>
              <div className="font-medium">{session.firstSeen}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Sessions</div>
              <div className="font-medium">
                {Number(session.totalSessions).toLocaleString()}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Events</div>
              <div className="font-medium">
                {Number(session.eventsCount).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs items-between w-full text-center px-8">
            <div className="space-y-1">
              <div className="text-muted-foreground">Device</div>
              <div className="font-medium flex items-center justify-center gap-1.5">
                <DeviceIcon className="h-3.5 w-3.5" />
                <span>{session.deviceType}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-muted-foreground">OS</div>
              <div className="font-medium flex items-center justify-center gap-1.5">
                <OsIcon className="h-3.5 w-3.5" />
                <span>{session.osName}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-muted-foreground">Browser</div>
              <div className="font-medium flex items-center justify-center gap-1.5">
                <BrowserIcon className="h-3.5 w-3.5" />
                <span>{session.browserName}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-1 text-xs">
          <div className="text-muted-foreground">Source</div>
          <div className="font-medium">{sourceLabel}</div>
        </div>
      </div>
    </MapPopup>
  );
}
