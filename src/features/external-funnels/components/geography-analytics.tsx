"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as React from "react";
import MapLibreGL from "maplibre-gl";
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
  MapMarker,
  MarkerContent,
  MapPopup,
  useMap,
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

const MARKER_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

const LOCATIONS_PER_PAGE = 6;

const getMarkerColor = (seed: string) => {
  const index = hashString(seed) % MARKER_COLORS.length;
  return MARKER_COLORS[index];
};

const getCountryColor = (seed: string) => {
  const hue = hashString(seed) % 360;
  return `hsl(${hue} 90% 40%)`;
};

const getReadableTextColor = (color: string) => {
  const match = color.match(/hsl\(\s*(\d+)\s+(\d+)%\s+(\d+)%\s*\)/);
  if (!match) return "hsl(0 0% 85%)";
  const h = Number(match[1]);
  const s = Number(match[2]);
  const l = Number(match[3]);
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);
  const targetLightness = l >= 50 ? l - 12 : l + 20;
  const readableLightness = clamp(targetLightness, 30, 85);
  const readableSaturation = clamp(s + 5, 50, 95);
  return `hsl(${h} ${Math.round(readableSaturation)}% ${Math.round(
    readableLightness
  )}%)`;
};

export function GeographyAnalytics({ funnelId }: GeographyAnalyticsProps) {
  const trpc = useTRPC();
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");
  const [locationsPage, setLocationsPage] = React.useState(1);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(
    null
  );
  const [mapZoom, setMapZoom] = React.useState(2);
  const [selectedCountryCode, setSelectedCountryCode] = React.useState<
    string | null
  >(null);
  const suppressCloseRef = React.useRef(false);
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

  const zoomInStart = 3;
  const zoomInEnd = 5;
  const zoomProgress = Math.min(
    Math.max((mapZoom - zoomInStart) / (zoomInEnd - zoomInStart), 0),
    1
  );
  const sessionOpacity = zoomProgress;
  const countryOpacity = 1 - zoomProgress;

  const MapSessionMarker = ({
    session,
    opacity,
    isInteractive,
  }: {
    session: SessionLocation;
    opacity: number;
    isInteractive: boolean;
  }) => {
    const { map } = useMap();
    const countryCode = session.countryCode || "Unknown";
    const city = session.city || "Unknown";
    const countryName = session.countryName || countryCode;
    const hasCoords =
      session.latitude != null &&
      session.longitude != null &&
      !(session.latitude === 0 && session.longitude === 0);
    const sessionCoords = hasCoords
      ? { lat: session.latitude, lng: session.longitude }
      : null;
    const cityCoords =
      !sessionCoords && city !== "Unknown"
        ? cityCoordsByKey.get(`${city}-${countryCode}`) || null
        : null;
    const coords =
      sessionCoords || cityCoords || getCountryCoordinates(countryCode);
    if (coords.lat == null || coords.lng == null) return null;
    const jittered = sessionCoords
      ? { lat: coords.lat, lng: coords.lng }
      : getJitteredCoordinates(
          coords.lat,
          coords.lng,
          session.sessionId,
          cityCoords ? 0.08 : 0.6
        );
    const displayName = session.visitorDisplayName || "Anonymous Visitor";
    const device = session.deviceType || "Unknown";
    const browser = session.browserName || "Unknown";
    const osName = session.osName || "Unknown";
    const markerColor = getMarkerColor(session.sessionId);
    const firstSeenValue = session.firstSeen || session.startedAt;
    const firstSeen = format(new Date(firstSeenValue), "MMM d, yyyy");
    const sessionsCount = session.totalSessions ?? 1;
    const eventsCount =
      typeof session.eventsCount === "number"
        ? session.eventsCount
        : (session.pageViews ?? 0);
    const sourceLabel = session.firstSource
      ? `${session.firstSource}${
          session.firstMedium ? ` / ${session.firstMedium}` : ""
        }${session.firstCampaign ? ` / ${session.firstCampaign}` : ""}`
      : session.firstReferrer || "Direct";

    const handleMarkerClick = () => {
      if (!isInteractive) return;
      map?.flyTo({
        center: [jittered.lng, jittered.lat],
        zoom: sessionCoords ? 14 : 6,
        duration: 1200,
        essential: true,
      });

      setActiveSessionId((current) => {
        suppressCloseRef.current = true;
        setTimeout(() => {
          suppressCloseRef.current = false;
        }, 0);
        return current === session.sessionId ? null : session.sessionId;
      });
    };

    const DeviceIcon = getDeviceIconForType(device);
    const BrowserIcon = getBrowserIconForType(browser);
    const OsIcon = getOsIconForType(osName);

    return (
      <MapMarker
        key={session.sessionId}
        longitude={jittered.lng}
        latitude={jittered.lat}
        scaleWithZoom={{
          minZoom: 2,
          maxZoom: 16,
          minScale: 0.7,
          maxScale: 1.8,
        }}
        onClick={isInteractive ? handleMarkerClick : undefined}
      >
        <MarkerContent
          className={isInteractive ? undefined : "pointer-events-none"}
        >
          <div
            className="relative flex h-4 w-4 items-center justify-center transition-opacity duration-300"
            style={{ opacity }}
          >
            <span
              className={cn(
                "absolute inline-flex h-5 w-5 animate-ping rounded-full opacity-30",
                markerColor
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-3.5 w-3.5 rounded-full border border-white/80 shadow-md",
                markerColor
              )}
            />
          </div>
        </MarkerContent>

        {activeSessionId === session.sessionId && (
          <MapPopup
            longitude={jittered.lng}
            latitude={jittered.lat}
            onClose={() => setActiveSessionId(null)}
            className="w-104 px-0 py-4"
            closeOnClick={false}
          >
            <div className="space-y-3 flex flex-col items-center">
              <div className="space-y-1 text-center">
                <div className="text-sm font-semibold">{displayName}</div>
                <div className="text-xs text-muted-foreground">
                  {getCountryFlag(countryCode)} {city}, {countryCode}
                </div>
              </div>

              <Separator />

              <div className="flex flex-col w-full gap-4 py-2">
                <div className="grid grid-cols-3 gap-2 text-xs justify-between w-full text-center px-8">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">First seen</div>
                    <div className="font-medium">{firstSeen}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Sessions</div>
                    <div className="font-medium">
                      {Number(sessionsCount).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Events</div>
                    <div className="font-medium">
                      {Number(eventsCount).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs items-between w-full text-center px-8">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Device</div>
                    <div className="font-medium flex items-center justify-center gap-1.5">
                      <DeviceIcon className="h-3.5 w-3.5" />
                      <span>{device}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-muted-foreground">OS</div>
                    <div className="font-medium flex items-center justify-center gap-1.5">
                      <OsIcon className="h-3.5 w-3.5" />
                      <span>{osName}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-muted-foreground">Browser</div>
                    <div className="font-medium flex items-center justify-center gap-1.5">
                      <BrowserIcon className="h-3.5 w-3.5" />
                      <span>{browser}</span>
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
        )}
      </MapMarker>
    );
  };

  const MapCountryMarker = ({
    countryCode,
    sessions,
    sessionsForCountry,
  }: {
    countryCode: string;
    sessions: number;
    sessionsForCountry: typeof filteredSessions;
  }) => {
    const { map } = useMap();
    const coords = getCountryCoordinates(countryCode);
    if (!coords.lat && !coords.lng) return null;
    const markerColor = getCountryColor(countryCode);

    const handleClick = () => {
      if (!map) return;
      setSelectedCountryCode(countryCode);
      const points = sessionsForCountry
        .map((session) => {
          const sessionCoords =
            session.latitude != null && session.longitude != null
              ? { lat: session.latitude, lng: session.longitude }
              : getCountryCoordinates(countryCode);
          if (!sessionCoords.lat && !sessionCoords.lng) return null;
          return getJitteredCoordinates(
            sessionCoords.lat,
            sessionCoords.lng,
            session.sessionId,
            session.latitude && session.longitude ? 0.05 : 0.4
          );
        })
        .filter((point): point is { lat: number; lng: number } =>
          Boolean(point)
        );

      if (points.length === 0) {
        map.flyTo({
          center: [coords.lng, coords.lat],
          zoom: zoomInEnd,
          duration: 900,
          essential: true,
        });
        return;
      }

      const bounds = new MapLibreGL.LngLatBounds();
      for (const point of points) {
        bounds.extend([point.lng, point.lat]);
      }
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      if (ne.lng === sw.lng && ne.lat === sw.lat) {
        map.flyTo({
          center: [ne.lng, ne.lat],
          zoom: zoomInEnd,
          duration: 900,
          essential: true,
        });
        return;
      }

      const prevZoom = map.getZoom();
      map.fitBounds(bounds, {
        padding: 120,
        duration: 900,
        maxZoom: 9,
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (Math.abs(map.getZoom() - prevZoom) < 0.1) {
            const center = bounds.getCenter();
            map.flyTo({
              center: [center.lng, center.lat],
              zoom: zoomInEnd,
              duration: 900,
              essential: true,
            });
          }
        });
      });
    };

    return (
      <MapMarker
        key={`country-${countryCode}`}
        longitude={coords.lng}
        latitude={coords.lat}
        scaleWithZoom={{
          minZoom: 1,
          maxZoom: 8,
          minScale: 0.8,
          maxScale: 1.2,
        }}
        onClick={countryOpacity >= 0.2 ? handleClick : undefined}
      >
        <MarkerContent className="pointer-events-auto">
          <div
            className={cn(
              "relative flex items-center justify-center rounded-full size-6 text-xs font-medium shadow-md transition-opacity duration-300 backdrop-blur-xl"
            )}
            style={{
              opacity: countryOpacity,
            }}
          >
            <span
              className="absolute animate-ping rounded-full opacity-25 size-6 pointer-events-none"
              style={{ backgroundColor: markerColor }}
            />
            <span
              className="absolute inset-0 rounded-full opacity-80 pointer-events-none"
              style={{ backgroundColor: markerColor }}
            />
            <span className="relative z-10">{sessions.toLocaleString()}</span>
          </div>
        </MarkerContent>
      </MapMarker>
    );
  };

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

  const sessionsByCountry = React.useMemo(() => {
    const map = new Map<string, typeof filteredSessions>();
    for (const session of filteredSessions) {
      const countryCode = session.countryCode || "Unknown";
      if (!map.has(countryCode)) {
        map.set(countryCode, []);
      }
      map.get(countryCode)!.push(session);
    }
    return map;
  }, [filteredSessions]);

  const multiSessionCountries = React.useMemo(() => {
    const set = new Set<string>();
    for (const [countryCode, sessions] of sessionsByCountry.entries()) {
      if (sessions.length > 1) {
        set.add(countryCode);
      }
    }
    return set;
  }, [sessionsByCountry]);

  React.useEffect(() => {
    if (mapZoom < zoomInStart && selectedCountryCode) {
      setSelectedCountryCode(null);
    }
  }, [mapZoom, selectedCountryCode, zoomInStart]);

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
              <MapZoomWatcher onZoomChange={setMapZoom} />
              {filteredSessions.map((session) => {
                const countryCode = session.countryCode || "Unknown";
                const isMultiCountry = multiSessionCountries.has(countryCode);
                const isUnlocked =
                  selectedCountryCode === countryCode || mapZoom >= zoomInEnd;
                const isInteractive = !isMultiCountry || isUnlocked;
                const opacity = !isMultiCountry
                  ? 1
                  : isInteractive
                    ? selectedCountryCode === countryCode
                      ? 1
                      : Math.max(sessionOpacity, 0.4)
                    : 0;

                return (
                  <MapSessionMarker
                    key={session.sessionId}
                    session={session}
                    opacity={opacity}
                    isInteractive={isInteractive}
                  />
                );
              })}
              {data.countries
                .filter((country) =>
                  multiSessionCountries.has(country.countryCode || "Unknown")
                )
                .map((country) => (
                  <MapCountryMarker
                    key={`country-${country.countryCode}`}
                    countryCode={country.countryCode}
                    sessions={country.sessions}
                    sessionsForCountry={
                      sessionsByCountry.get(country.countryCode || "Unknown") ??
                      []
                    }
                  />
                ))}
              <MapClickClose
                onClose={() => setActiveSessionId(null)}
                suppressRef={suppressCloseRef}
              />
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

function MapClickClose({
  onClose,
  suppressRef,
}: {
  onClose: () => void;
  suppressRef: React.MutableRefObject<boolean>;
}) {
  const { map, isLoaded } = useMap();

  React.useEffect(() => {
    if (!map || !isLoaded) return;

    const handleClick = () => {
      if (suppressRef.current) return;
      onClose();
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map, isLoaded, onClose, suppressRef]);

  return null;
}

function MapZoomWatcher({
  onZoomChange,
}: {
  onZoomChange: (zoom: number) => void;
}) {
  const { map, isLoaded } = useMap();

  React.useEffect(() => {
    if (!map || !isLoaded) return;

    const handleZoom = () => onZoomChange(map.getZoom());
    handleZoom();
    map.on("zoom", handleZoom);
    return () => {
      map.off("zoom", handleZoom);
    };
  }, [map, isLoaded, onZoomChange]);

  return null;
}
