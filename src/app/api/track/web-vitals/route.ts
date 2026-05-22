import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
	anonymousUserProfiles,
	funnel as funnelTable,
	funnelSession,
	funnelWebVital,
} from "@/db/schema";
import { getPrivacyCompliantIp } from "@/lib/gdpr-utils";

type GeoData = {
	status?: string;
	country?: string;
	countryCode?: string;
	regionName?: string;
	city?: string;
};

// Web Vital validation schema
const WebVitalSchema = z.object({
	funnelId: z.string(),
	sessionId: z.string(),
	anonymousId: z.string().optional(),
	pageUrl: z.string(),
	pagePath: z.string(),
	pageTitle: z.string().optional(),
	metric: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB", "FID"]),
	value: z.number(),
	rating: z.enum(["GOOD", "NEEDS_IMPROVEMENT", "POOR"]),
	delta: z.number().optional(),
	id_metric: z.string().optional(),
	deviceType: z.string().optional(),
	browserName: z.string().optional(),
	browserVersion: z.string().optional(),
	osName: z.string().optional(),
	osVersion: z.string().optional(),
	screenWidth: z.number().optional(),
	screenHeight: z.number().optional(),
	timestamp: z.string(),
});

export async function POST(req: NextRequest) {
	try {
		// Get headers from request
		const apiKey = req.headers.get("X-Aurea-API-Key");
		const funnelId = req.headers.get("X-Aurea-Funnel-ID");

		if (!apiKey || !funnelId) {
			return NextResponse.json(
				{ error: "Missing API key or Funnel ID" },
				{
					status: 401,
					headers: {
						"Access-Control-Allow-Origin": "*",
					},
				},
			);
		}

		// Verify funnel and API key
		const funnel = await db.query.funnel.findFirst({
			where: and(
				eq(funnelTable.id, funnelId),
				eq(funnelTable.apiKey, apiKey),
				eq(funnelTable.funnelType, "EXTERNAL")
			),
			columns: {
				id: true,
				locationId: true,
				organizationId: true,
				trackingConfig: true,
			},
		});

		if (!funnel) {
			return NextResponse.json(
				{ error: "Invalid API key or Funnel ID" },
				{
					status: 401,
					headers: {
						"Access-Control-Allow-Origin": "*",
					},
				},
			);
		}

		// Parse request body
		const body = await req.json();
		const data = WebVitalSchema.parse(body);

		// Get client IP for geo lookup
		let ip =
			req.headers.get("x-forwarded-for")?.split(",")[0] ||
			req.headers.get("x-real-ip") ||
			"unknown";

		// Check anonymization settings
		const trackingConfig =
			funnel.trackingConfig &&
			typeof funnel.trackingConfig === "object" &&
			!Array.isArray(funnel.trackingConfig)
				? (funnel.trackingConfig as Record<string, unknown>)
				: {};
		const anonymizeIp =
			typeof trackingConfig.anonymizeIp === "boolean"
				? trackingConfig.anonymizeIp
				: true;
		const hashIp =
			typeof trackingConfig.hashIp === "boolean"
				? trackingConfig.hashIp
				: false;

		// Apply privacy settings to IP
		ip = getPrivacyCompliantIp(ip, {
			anonymizeIp,
			hashIp,
		});

		// Fetch geo data for this IP (if enabled and not already cached)
		let geoData: GeoData | null = null;
		if (!anonymizeIp && !hashIp) {
			try {
				const geoResponse = await fetch(
					`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,timezone`,
				);
				if (geoResponse.ok) {
					geoData = (await geoResponse.json()) as GeoData;
					if (geoData.status === "fail") {
						geoData = null;
					}
				}
			} catch (error) {
				console.error("[Web Vitals API] Geo lookup failed:", error);
			}
		}

		// Check if session exists, create if not
		let session = await db.query.funnelSession.findFirst({
			where: eq(funnelSession.sessionId, data.sessionId),
			columns: { id: true, sessionId: true },
		});

		if (!session) {
			console.log(`[Web Vitals API] Creating session ${data.sessionId} for web vital tracking`);
			
			session = await db.transaction(async (tx) => {
				if (data.anonymousId) {
					await tx
						.insert(anonymousUserProfiles)
						.values({
							id: data.anonymousId,
							displayName: `Visitor #${data.anonymousId.slice(-6)}`,
							firstSeen: new Date(data.timestamp),
							lastSeen: new Date(data.timestamp),
							totalEvents: 0,
							totalSessions: 1,
						})
						.onConflictDoUpdate({
							target: anonymousUserProfiles.id,
							set: {
								lastSeen: new Date(data.timestamp),
							},
						});
				}

				const [createdSession] = await tx
					.insert(funnelSession)
					.values({
					id: createId(),
					sessionId: data.sessionId,
					funnelId: funnel.id,
					locationId: funnel.locationId,
					anonymousId: data.anonymousId,
					profileId: data.anonymousId,
					startedAt: new Date(data.timestamp),
					endedAt: new Date(data.timestamp),
					durationSeconds: 0,
					pageViews: 0,
					eventsCount: 0,
					converted: false,
					firstPageUrl: data.pageUrl,
					lastPageUrl: data.pageUrl,
					deviceType: data.deviceType,
					browserName: data.browserName,
					browserVersion: data.browserVersion,
					osName: data.osName,
					osVersion: data.osVersion,
					countryCode: geoData?.countryCode,
					countryName: geoData?.country,
					region: geoData?.regionName,
					city: geoData?.city,
					ipAddress: ip,
					updatedAt: new Date(),
				})
					.returning({ id: funnelSession.id, sessionId: funnelSession.sessionId });

				return createdSession ?? null;
			});
		}

		// Store web vital
		await db.insert(funnelWebVital).values({
				id: createId(),
				funnelId: funnel.id,
				locationId: funnel.locationId,
				sessionId: data.sessionId,
				anonymousId: data.anonymousId,
				pageUrl: data.pageUrl,
				pagePath: data.pagePath,
				pageTitle: data.pageTitle,
				metric: data.metric,
				value: data.value,
				rating: data.rating,
				delta: data.delta,
				idMetric: data.id_metric,
				deviceType: data.deviceType,
				browserName: data.browserName,
				browserVersion: data.browserVersion,
				osName: data.osName,
				osVersion: data.osVersion,
				screenWidth: data.screenWidth,
				screenHeight: data.screenHeight,
				countryCode: geoData?.countryCode,
				countryName: geoData?.country,
				region: geoData?.regionName,
				city: geoData?.city,
				timestamp: new Date(data.timestamp),
		});

		// Update session aggregates (calculate average web vitals)
		if (session) {
			// Calculate new averages
			const webVitals = await db.query.funnelWebVital.findMany({
				where: eq(funnelWebVital.sessionId, data.sessionId),
				columns: {
					metric: true,
					value: true,
				},
			});

			const lcpValues = webVitals
				.filter((v) => v.metric === "LCP")
				.map((v) => v.value);
			const inpValues = webVitals
				.filter((v) => v.metric === "INP")
				.map((v) => v.value);
			const clsValues = webVitals
				.filter((v) => v.metric === "CLS")
				.map((v) => v.value);
			const fcpValues = webVitals
				.filter((v) => v.metric === "FCP")
				.map((v) => v.value);
			const ttfbValues = webVitals
				.filter((v) => v.metric === "TTFB")
				.map((v) => v.value);

			const avg = (arr: number[]) =>
				arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

			// Calculate experience score (0-100, higher is better)
			const calculateExperienceScore = () => {
				let score = 100;
				const avgLcp = avg(lcpValues);
				const avgInp = avg(inpValues);
				const avgCls = avg(clsValues);
				const avgFcp = avg(fcpValues);
				const avgTtfb = avg(ttfbValues);

				// LCP: good <= 2500, poor >= 4000
				if (avgLcp) {
					if (avgLcp > 4000) score -= 30;
					else if (avgLcp > 2500) score -= 15;
				}

				// INP: good <= 200, poor >= 500
				if (avgInp) {
					if (avgInp > 500) score -= 25;
					else if (avgInp > 200) score -= 12;
				}

				// CLS: good <= 0.1, poor >= 0.25
				if (avgCls) {
					if (avgCls > 0.25) score -= 20;
					else if (avgCls > 0.1) score -= 10;
				}

				// FCP: good <= 1800, poor >= 3000
				if (avgFcp) {
					if (avgFcp > 3000) score -= 15;
					else if (avgFcp > 1800) score -= 7;
				}

				// TTFB: good <= 800, poor >= 1800
				if (avgTtfb) {
					if (avgTtfb > 1800) score -= 10;
					else if (avgTtfb > 800) score -= 5;
				}

				return Math.max(0, score);
			};

			await db
				.update(funnelSession)
				.set({
					avgLcp: avg(lcpValues),
					avgInp: avg(inpValues),
					avgCls: avg(clsValues),
					avgFcp: avg(fcpValues),
					avgTtfb: avg(ttfbValues),
					experienceScore: calculateExperienceScore(),
					updatedAt: new Date(),
				})
				.where(eq(funnelSession.sessionId, data.sessionId));
		}

		return NextResponse.json(
			{
				success: true,
			},
			{
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers":
						"Content-Type, X-Aurea-API-Key, X-Aurea-Funnel-ID",
				},
			},
		);
	} catch (error) {
		console.error("[Web Vitals API] Error processing web vital:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request format", details: error.issues },
				{
					status: 400,
					headers: {
						"Access-Control-Allow-Origin": "*",
					},
				},
			);
		}

		return NextResponse.json(
			{ error: "Internal server error" },
			{
				status: 500,
				headers: {
					"Access-Control-Allow-Origin": "*",
				},
			},
		);
	}
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers":
				"Content-Type, X-Aurea-API-Key, X-Aurea-Funnel-ID",
		},
	});
}
