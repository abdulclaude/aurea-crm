import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export type GeoPoint = {
	lat: number;
	lng: number;
	count: number;
	country: string;
	countryCode: string;
};

export type AnalyticsOverview = {
	totalViews: number;
	pages: { path: string; count: number }[];
	referrers: { source: string; count: number }[];
	countries: { code: string; name: string; count: number }[];
	geoPoints: GeoPoint[];
};

export function useAnalyticsOverview(funnelId: string, timeRange: "7d" | "30d" | "90d" = "30d"): AnalyticsOverview {
	const trpc = useTRPC();

	// Use existing procedures
	const { data: analyticsData } = useSuspenseQuery(
		trpc.externalFunnels.getAnalytics.queryOptions({
			funnelId,
			timeRange,
		})
	);

	const { data: geoData } = useSuspenseQuery(
		trpc.externalFunnels.getGeographyAnalytics.queryOptions({
			funnelId,
			timeRange,
		})
	);

	const { data: eventsResult } = useSuspenseQuery(
		trpc.externalFunnels.getEvents.queryOptions({
			funnelId,
			limit: 100,
		})
	);

	// Transform geography data into geo points
	const geoPoints: GeoPoint[] = geoData.countries
		.filter((c) => c.countryCode && c.countryCode !== "Unknown")
		.map((c) => ({
			lat: getCountryCoordinates(c.countryCode).lat,
			lng: getCountryCoordinates(c.countryCode).lng,
			count: c.sessions,
			country: c.countryName || c.countryCode,
			countryCode: c.countryCode,
		}))
		.filter((p) => p.lat !== 0 || p.lng !== 0);

	// Extract top pages from recent events
	const pageViewEvents = eventsResult.events.filter((e) => e.eventName === "page_view");
	const pageMap = new Map<string, number>();
	
	for (const event of pageViewEvents) {
		const path = event.pagePath || "/";
		pageMap.set(path, (pageMap.get(path) || 0) + 1);
	}

	const pages = Array.from(pageMap.entries())
		.map(([path, count]) => ({ path, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	// Extract top referrers from recent events
	const referrerMap = new Map<string, number>();
	
	for (const event of eventsResult.events) {
		const referrer = event.referrer;
		if (referrer) {
			referrerMap.set(referrer, (referrerMap.get(referrer) || 0) + 1);
		}
	}

	const referrers = Array.from(referrerMap.entries())
		.map(([source, count]) => ({ source, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	// Extract countries
	const countries = geoData.countries
		.slice(0, 5)
		.map((c) => ({
			code: c.countryCode,
			name: c.countryName || c.countryCode,
			count: c.sessions,
		}));

	return {
		totalViews: analyticsData.stats.totalPageViews,
		pages,
		referrers,
		countries,
		geoPoints,
	};
}

// Country coordinates mapping
export function getCountryCoordinates(code: string): { lat: number; lng: number } {
	const coords: Record<string, { lat: number; lng: number }> = {
		US: { lat: 37.0902, lng: -95.7129 },
		GB: { lat: 55.3781, lng: -3.436 },
		CA: { lat: 56.1304, lng: -106.3468 },
		AU: { lat: -25.2744, lng: 133.7751 },
		DE: { lat: 51.1657, lng: 10.4515 },
		FR: { lat: 46.2276, lng: 2.2137 },
		IT: { lat: 41.8719, lng: 12.5674 },
		ES: { lat: 40.4637, lng: -3.7492 },
		NL: { lat: 52.1326, lng: 5.2913 },
		SE: { lat: 60.1282, lng: 18.6435 },
		NO: { lat: 60.472, lng: 8.4689 },
		DK: { lat: 56.2639, lng: 9.5018 },
		FI: { lat: 61.9241, lng: 25.7482 },
		PL: { lat: 51.9194, lng: 19.1451 },
		CH: { lat: 46.8182, lng: 8.2275 },
		AT: { lat: 47.5162, lng: 14.5501 },
		BE: { lat: 50.5039, lng: 4.4699 },
		IE: { lat: 53.4129, lng: -8.2439 },
		PT: { lat: 39.3999, lng: -8.2245 },
		GR: { lat: 39.0742, lng: 21.8243 },
		CZ: { lat: 49.8175, lng: 15.473 },
		RO: { lat: 45.9432, lng: 24.9668 },
		HU: { lat: 47.1625, lng: 19.5033 },
		JP: { lat: 36.2048, lng: 138.2529 },
		CN: { lat: 35.8617, lng: 104.1954 },
		IN: { lat: 20.5937, lng: 78.9629 },
		KR: { lat: 35.9078, lng: 127.7669 },
		SG: { lat: 1.3521, lng: 103.8198 },
		MY: { lat: 4.2105, lng: 101.9758 },
		TH: { lat: 15.87, lng: 100.9925 },
		ID: { lat: -0.7893, lng: 113.9213 },
		PH: { lat: 12.8797, lng: 121.774 },
		VN: { lat: 14.0583, lng: 108.2772 },
		NZ: { lat: -40.9006, lng: 174.886 },
		BR: { lat: -14.235, lng: -51.9253 },
		MX: { lat: 23.6345, lng: -102.5528 },
		AR: { lat: -38.4161, lng: -63.6167 },
		CL: { lat: -35.6751, lng: -71.543 },
		CO: { lat: 4.5709, lng: -74.2973 },
		ZA: { lat: -30.5595, lng: 22.9375 },
		EG: { lat: 26.8206, lng: 30.8025 },
		NG: { lat: 9.082, lng: 8.6753 },
		AE: { lat: 23.4241, lng: 53.8478 },
		SA: { lat: 23.8859, lng: 45.0792 },
		IL: { lat: 31.0461, lng: 34.8516 },
		TR: { lat: 38.9637, lng: 35.2433 },
		RU: { lat: 61.524, lng: 105.3188 },
		UA: { lat: 48.3794, lng: 31.1656 },
		LOCAL: { lat: 51.5074, lng: -0.1278 },
	};

	return coords[code] || { lat: 0, lng: 0 };
}
