"use client";

import { memo } from "react";
import type { GeoPoint } from "../../hooks/use-analytics-overview";
import { WorldMap } from "./WorldMap";

type GlobeProps = {
	geoPoints: GeoPoint[];
};

function GlobeComponent({ geoPoints }: GlobeProps) {
	return <WorldMap geoPoints={geoPoints} />;
}

export const GlobeVisualization = memo(GlobeComponent);
