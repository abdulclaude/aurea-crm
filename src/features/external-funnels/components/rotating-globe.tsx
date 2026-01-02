"use client";

import dynamic from "next/dynamic";
import { useAnalyticsOverview } from "../hooks/use-analytics-overview";
import { StatsDock } from "./analytics/StatsDock";

type RotatingGlobeProps = {
	countries: any[];
	funnelId?: string;
};

// Dynamic import of Globe to avoid SSR issues
const GlobeVisualization = dynamic(
	() => import("./analytics/GlobeVisualization").then((mod) => ({ default: mod.GlobeVisualization })),
	{ 
		ssr: false,
		loading: () => (
			<div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
				<div className="text-gray-600 flex flex-col items-center gap-3">
					<div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
					<div className="text-sm font-medium">Loading globe...</div>
				</div>
			</div>
		),
	}
);

function RotatingGlobeComponent({ funnelId, countries }: RotatingGlobeProps) {
	// Use the analytics hook if we have a funnelId, otherwise fall back to countries prop
	const data = funnelId 
		? useAnalyticsOverview(funnelId, "30d")
		: {
				totalViews: countries.reduce((sum, c) => sum + c.sessions, 0),
				pages: [],
				referrers: [],
				countries: countries.map(c => ({
					code: c.countryCode,
					name: c.countryName,
					count: c.sessions,
				})),
				geoPoints: countries.map(c => ({
					lat: 0,
					lng: 0,
					count: c.sessions,
					country: c.countryName,
					countryCode: c.countryCode,
				})),
			};

	return (
		<div className="relative w-full h-full">
			<GlobeVisualization geoPoints={data.geoPoints} />
			<StatsDock data={data} />
		</div>
	);
}

export const RotatingGlobe = RotatingGlobeComponent;
