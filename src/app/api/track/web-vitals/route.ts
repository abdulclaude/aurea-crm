import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
	anonymousUserProfiles,
	funnel as funnelTable,
	funnelSession,
	funnelWebVital,
} from "@/db/schema";
import { buildAnonymousProfileId } from "@/features/external-funnels/lib/anonymous-profile-identity";
import {
	externalTelemetryTimesAreCurrent,
	externalWebVitalSchema,
	MAX_EXTERNAL_TELEMETRY_BODY_BYTES,
} from "@/features/external-funnels/lib/external-telemetry-contract";
import {
	enforceFunnelTelemetryQuota,
	FunnelTelemetryQuotaExceededError,
	FunnelTelemetryQuotaUnavailableError,
} from "@/features/external-funnels/server/telemetry-quota";
import {
	readBoundedRawBody,
	WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";
import { parseIPAddress } from "@/lib/device-parser";
import { getPrivacyCompliantIp } from "@/lib/gdpr-utils";

export async function POST(req: NextRequest) {
		try {
			if (
				req.headers.get("sec-gpc") === "1" ||
				req.headers.get("dnt") === "1"
			) {
				return response("Performance tracking is not permitted.", 403);
			}
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

			const data = externalWebVitalSchema.parse(
				JSON.parse(
					await readBoundedRawBody(req, MAX_EXTERNAL_TELEMETRY_BODY_BYTES),
				),
			);
			if (data.funnelId !== funnel.id) {
			return NextResponse.json(
				{ error: "Funnel ID does not match the authenticated funnel" },
				{ status: 400 },
				);
			}
			if (!externalTelemetryTimesAreCurrent([Date.parse(data.timestamp)])) {
				return response("Performance event time is outside the accepted window.", 400);
			}
			await enforceFunnelTelemetryQuota({
				request: req,
				organizationId: funnel.organizationId,
				funnelId: funnel.id,
			});
			if (data.anonymousId) {
				const erasedProfile = await db.query.anonymousUserProfiles.findFirst({
					where: and(
						eq(anonymousUserProfiles.organizationId, funnel.organizationId),
						funnel.locationId
							? eq(anonymousUserProfiles.locationId, funnel.locationId)
							: isNull(anonymousUserProfiles.locationId),
						eq(anonymousUserProfiles.anonymousId, data.anonymousId),
					),
					columns: { deletionRequestedAt: true },
				});
				if (erasedProfile?.deletionRequestedAt) {
					return response("Performance event accepted without retention.", 202);
				}
			}

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

		const geoData = await parseIPAddress(ip);

		// Check if session exists, create if not
		let session = await db.query.funnelSession.findFirst({
			where: and(
				eq(funnelSession.sessionId, data.sessionId),
				eq(funnelSession.funnelId, funnel.id),
			),
			columns: { id: true, sessionId: true },
		});

		if (!session) {
			session = await db.transaction(async (tx) => {
				const [existingProfile] = data.anonymousId
					? await tx
							.select({ id: anonymousUserProfiles.id })
							.from(anonymousUserProfiles)
							.where(
								and(
									eq(
										anonymousUserProfiles.organizationId,
										funnel.organizationId,
									),
									funnel.locationId
										? eq(
												anonymousUserProfiles.locationId,
												funnel.locationId,
											)
										: isNull(anonymousUserProfiles.locationId),
									eq(anonymousUserProfiles.anonymousId, data.anonymousId),
								),
							)
							.limit(1)
					: [];
				const profileId = data.anonymousId
					? (existingProfile?.id ??
						buildAnonymousProfileId(
							{
								organizationId: funnel.organizationId,
								locationId: funnel.locationId,
							},
							data.anonymousId,
						))
					: null;
				if (data.anonymousId && profileId) {
					await tx
						.insert(anonymousUserProfiles)
						.values({
							id: profileId,
							organizationId: funnel.organizationId,
							locationId: funnel.locationId,
							anonymousId: data.anonymousId,
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
					profileId,
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
					countryCode: geoData.countryCode,
					countryName: geoData.countryName,
					region: geoData.region,
					city: geoData.city,
					ipAddress: ip,
					updatedAt: new Date(),
					})
					.onConflictDoNothing({
						target: [funnelSession.funnelId, funnelSession.sessionId],
					})
					.returning({ id: funnelSession.id, sessionId: funnelSession.sessionId });

				if (createdSession) return createdSession;
				const [concurrentSession] = await tx
					.select({ id: funnelSession.id, sessionId: funnelSession.sessionId })
					.from(funnelSession)
					.where(
						and(
							eq(funnelSession.funnelId, funnel.id),
							eq(funnelSession.sessionId, data.sessionId),
						),
					)
					.limit(1);
				return concurrentSession ?? null;
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
					countryCode: geoData.countryCode,
					countryName: geoData.countryName,
					region: geoData.region,
					city: geoData.city,
				timestamp: new Date(data.timestamp),
		});

		// Update session aggregates (calculate average web vitals)
		if (session) {
			// Calculate new averages
			const webVitals = await db.query.funnelWebVital.findMany({
				where: and(
					eq(funnelWebVital.sessionId, data.sessionId),
					eq(funnelWebVital.funnelId, funnel.id),
				),
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
				.where(
					and(
						eq(funnelSession.sessionId, data.sessionId),
						eq(funnelSession.funnelId, funnel.id),
					),
				);
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
			if (error instanceof FunnelTelemetryQuotaExceededError) {
				return NextResponse.json(
					{ error: "Performance tracking request limit reached." },
					{
						status: 429,
						headers: {
							"Access-Control-Allow-Origin": "*",
							"Retry-After": String(error.retryAfterSeconds),
						},
					},
				);
			}
			if (error instanceof FunnelTelemetryQuotaUnavailableError) {
				return response("Performance tracking is temporarily unavailable.", 503);
			}
			if (error instanceof WebhookPayloadTooLargeError) {
				return response("Performance tracking payload is too large.", 413);
			}
			if (error instanceof z.ZodError || error instanceof SyntaxError) {
				return response("Performance tracking payload is invalid.", 400);
			}
			return response("Performance tracking is temporarily unavailable.", 503);
		}
}

function response(message: string, status: number) {
	return NextResponse.json(
		{ error: message },
		{ status, headers: { "Access-Control-Allow-Origin": "*" } },
	);
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
