"use client";

import Globe from "globe.gl";
import * as React from "react";
import { cn } from "@/lib/utils";
import { getCountryCoordinates } from "@/features/external-funnels/hooks/use-analytics-overview";

type SessionLocation = {
  sessionId: string;
  countryCode?: string | null;
  countryName?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  visitorDisplayName?: string | null;
};

type GeographyGlobeProps = {
  sessions: SessionLocation[];
  className?: string;
};

const createGlobe = Globe as unknown as () => (element: HTMLElement) => any;
type GlobeInstance = ReturnType<ReturnType<typeof createGlobe>>;

const MARKER_COLORS = [
  "#10B981",
  "#38BDF8",
  "#6366F1",
  "#F59E0B",
  "#F43F5E",
  "#06B6D4",
];

const hashString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getMarkerColor = (seed: string) => {
  const index = hashString(seed) % MARKER_COLORS.length;
  return MARKER_COLORS[index];
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

type GlobePoint = {
  lat: number;
  lng: number;
  color: string;
  label: string;
};

export function GeographyGlobe({ sessions, className }: GeographyGlobeProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const globeRef = React.useRef<GlobeInstance | null>(null);

  const points = React.useMemo<GlobePoint[]>(() => {
    return sessions
      .map((session) => {
        const countryCode = session.countryCode || "Unknown";
        const coords =
          session.latitude && session.longitude
            ? { lat: session.latitude, lng: session.longitude }
            : getCountryCoordinates(countryCode);

        if (!coords.lat && !coords.lng) return null;

        const jittered = getJitteredCoordinates(
          coords.lat,
          coords.lng,
          session.sessionId,
          session.latitude && session.longitude ? 0.05 : 0.4
        );

        const label =
          session.visitorDisplayName ||
          session.city ||
          session.countryName ||
          "Anonymous Visitor";

        return {
          lat: jittered.lat,
          lng: jittered.lng,
          color: getMarkerColor(session.sessionId),
          label,
        };
      })
      .filter((point): point is GlobePoint => Boolean(point));
  }, [sessions]);

  React.useEffect(() => {
    if (!containerRef.current || globeRef.current) return;

    const globe = createGlobe()(containerRef.current)
      .globeImageUrl(
        "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      )
      .bumpImageUrl(
        "https://unpkg.com/three-globe/example/img/earth-topology.png"
      )
      .backgroundColor("rgba(0,0,0,0)")
      .pointColor((point: GlobePoint) => point.color)
      .pointAltitude(0.02)
      .pointRadius(0.35)
      .pointLabel((point: GlobePoint) => point.label);

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.6;
    globe.controls().enableZoom = true;
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.6 });

    globeRef.current = globe;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      globe.width(width);
      globe.height(height);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      globeRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  React.useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointsData(points);
  }, [points]);

  return (
    <div
      ref={containerRef}
      className={cn("h-[520px] w-full", className)}
    />
  );
}
