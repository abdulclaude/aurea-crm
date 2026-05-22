/**
 * tRPC Router for Ad Analytics
 * Provides queries for ad spend, ROAS, and performance metrics
 */

import { z } from "zod";
import { and, asc, eq, gte, isNotNull, lte, type SQL } from "drizzle-orm";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { db } from "@/db";
import { adSpend, funnelSession } from "@/db/schema";

type AdRecord = typeof adSpend.$inferSelect;
type AdMetrics = {
	spend: number;
	revenue: number;
	impressions: number;
	clicks: number;
	conversions: number;
};

const emptyMetrics = (): AdMetrics => ({
	spend: 0,
	revenue: 0,
	impressions: 0,
	clicks: 0,
	conversions: 0,
});

const addAdRecord = (metrics: AdMetrics, record: AdRecord): void => {
	metrics.spend += Number(record.spend);
	metrics.revenue += Number(record.revenue ?? 0);
	metrics.impressions += record.impressions ?? 0;
	metrics.clicks += record.clicks ?? 0;
	metrics.conversions += record.conversions ?? 0;
};

const calculateDerivedMetrics = (metrics: AdMetrics) => {
	const roas = metrics.spend > 0 ? (metrics.revenue / metrics.spend) * 100 : 0;
	const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
	const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
	const cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
	const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
	const conversionRate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;

	return { roas, cpa, cpc, cpm, ctr, conversionRate };
};

function adSpendWhere(input: {
	organizationId: string;
	locationId: string | null;
	funnelId?: string;
	startDate: string;
	endDate: string;
	platform?: "facebook" | "google" | "tiktok" | "all";
	requireCampaign?: boolean;
}): SQL | undefined {
	return and(
		eq(adSpend.organizationId, input.organizationId),
		gte(adSpend.date, input.startDate),
		lte(adSpend.date, input.endDate),
		input.locationId ? eq(adSpend.locationId, input.locationId) : undefined,
		input.funnelId ? eq(adSpend.funnelId, input.funnelId) : undefined,
		input.platform && input.platform !== "all" ? eq(adSpend.platform, input.platform) : undefined,
		input.requireCampaign ? isNotNull(adSpend.campaignId) : undefined
	);
}

export const adsRouter = createTRPCRouter({
	/**
	 * Get ad spend by platform for a date range
	 */
	getSpendByPlatform: protectedProcedure
		.input(
			z.object({
				funnelId: z.string().optional(),
				startDate: z.string(), // ISO date string
				endDate: z.string(), // ISO date string
				platform: z
					.enum(["facebook", "google", "tiktok", "all"])
					.optional()
					.default("all"),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { funnelId, startDate, endDate, platform } = input;

			const records = await db
				.select()
				.from(adSpend)
				.where(adSpendWhere({ organizationId: ctx.orgId!, locationId: ctx.locationId, funnelId, startDate, endDate, platform }));

			const byPlatform = new Map<string, AdMetrics>();
			for (const record of records) {
				const metrics = byPlatform.get(record.platform) ?? emptyMetrics();
				addAdRecord(metrics, record);
				byPlatform.set(record.platform, metrics);
			}

			const platforms = Array.from(byPlatform.entries()).map(([platformName, metrics]) => {
				const derived = calculateDerivedMetrics(metrics);
				return {
					platform: platformName,
					...metrics,
					...derived,
					profit: metrics.revenue - metrics.spend,
				};
			});

			return {
				platforms,
				total: {
					spend: platforms.reduce((acc, p) => acc + p.spend, 0),
					revenue: platforms.reduce((acc, p) => acc + p.revenue, 0),
					impressions: platforms.reduce((acc, p) => acc + p.impressions, 0),
					clicks: platforms.reduce((acc, p) => acc + p.clicks, 0),
					conversions: platforms.reduce((acc, p) => acc + p.conversions, 0),
					profit: platforms.reduce((acc, p) => acc + p.profit, 0),
				},
			};
		}),

	/**
	 * Get ROAS over time (chart data)
	 */
	getROASChart: protectedProcedure
		.input(
			z.object({
				funnelId: z.string().optional(),
				startDate: z.string(),
				endDate: z.string(),
				platform: z
					.enum(["facebook", "google", "tiktok", "all"])
					.optional()
					.default("all"),
				groupBy: z.enum(["day", "week", "month"]).optional().default("day"),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { funnelId, startDate, endDate, platform, groupBy } = input;

			const records = await db
				.select()
				.from(adSpend)
				.where(adSpendWhere({ organizationId: ctx.orgId!, locationId: ctx.locationId, funnelId, startDate, endDate, platform }))
				.orderBy(asc(adSpend.date));

			const grouped = new Map<string, AdMetrics & { date: string }>();

			for (const record of records) {
				let dateKey: string;

				if (groupBy === "day") {
					dateKey = record.date;
				} else if (groupBy === "week") {
					const d = new Date(record.date);
					const day = d.getDay();
					const diff = d.getDate() - day + (day === 0 ? -6 : 1);
					d.setDate(diff);
					dateKey = d.toISOString().split("T")[0];
				} else {
					dateKey = record.date.substring(0, 7);
				}

				if (!grouped.has(dateKey)) {
					grouped.set(dateKey, {
						date: dateKey,
						...emptyMetrics(),
					});
				}

				const group = grouped.get(dateKey);
				if (group) {
					addAdRecord(group, record);
				}
			}

			const chartData = Array.from(grouped.values()).map((item) => ({
				date: item.date,
				spend: item.spend,
				revenue: item.revenue,
				roas: item.spend > 0 ? (item.revenue / item.spend) * 100 : 0,
				impressions: item.impressions,
				clicks: item.clicks,
				conversions: item.conversions,
			}));

			return chartData;
		}),

	/**
	 * Get top campaigns by performance
	 */
	getTopCampaigns: protectedProcedure
		.input(
			z.object({
				funnelId: z.string().optional(),
				startDate: z.string(),
				endDate: z.string(),
				platform: z
					.enum(["facebook", "google", "tiktok", "all"])
					.optional()
					.default("all"),
				orderBy: z
					.enum(["roas", "revenue", "conversions", "spend"])
					.optional()
					.default("roas"),
				limit: z.number().optional().default(10),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { funnelId, startDate, endDate, platform, orderBy, limit } = input;

			const records = await db
				.select()
				.from(adSpend)
				.where(
					adSpendWhere({
						organizationId: ctx.orgId!,
						locationId: ctx.locationId,
						funnelId,
						startDate,
						endDate,
						platform,
						requireCampaign: true,
					})
				);

			const groupedCampaigns = new Map<string, AdMetrics & { platform: string; campaignId: string; campaignName: string }>();
			for (const record of records) {
				const campaignId = record.campaignId ?? "";
				const key = `${record.platform}:${campaignId}:${record.campaignName ?? ""}`;
				const metrics =
					groupedCampaigns.get(key) ??
					({ ...emptyMetrics(), platform: record.platform, campaignId, campaignName: record.campaignName || campaignId || "Unknown" });
				addAdRecord(metrics, record);
				groupedCampaigns.set(key, metrics);
			}

			const campaigns = Array.from(groupedCampaigns.values())
				.map((item) => {
					const derived = calculateDerivedMetrics(item);
					return {
						platform: item.platform,
						campaignId: item.campaignId,
						campaignName: item.campaignName,
						spend: item.spend,
						revenue: item.revenue,
						impressions: item.impressions,
						clicks: item.clicks,
						conversions: item.conversions,
						roas: derived.roas,
						cpa: derived.cpa,
					};
				})
				.sort((a, b) => {
					switch (orderBy) {
						case "roas":
							return b.roas - a.roas;
						case "revenue":
							return b.revenue - a.revenue;
						case "conversions":
							return b.conversions - a.conversions;
						case "spend":
							return b.spend - a.spend;
						default:
							return 0;
					}
				})
				.slice(0, limit);

			return campaigns;
		}),

	/**
	 * Get attribution breakdown (first-touch vs last-touch)
	 */
	getAttributionBreakdown: protectedProcedure
		.input(
			z.object({
				funnelId: z.string(),
				startDate: z.string(),
				endDate: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { funnelId, startDate, endDate } = input;

			const sessions = await db.query.funnelSession.findMany({
				where: and(
					eq(funnelSession.funnelId, funnelId),
					eq(funnelSession.converted, true),
					gte(funnelSession.createdAt, new Date(startDate)),
					lte(funnelSession.createdAt, new Date(endDate))
				),
				columns: {
					conversionValue: true,
					conversionPlatform: true,
					firstFbclid: true,
					firstGclid: true,
					firstTtclid: true,
					lastFbclid: true,
					lastGclid: true,
					lastTtclid: true,
				},
			});

			// Count first-touch attribution
			const firstTouch = {
				facebook: 0,
				google: 0,
				tiktok: 0,
				direct: 0,
			};

			// Count last-touch attribution
			const lastTouch = {
				facebook: 0,
				google: 0,
				tiktok: 0,
				direct: 0,
			};

			// Revenue by platform
			const firstTouchRevenue = {
				facebook: 0,
				google: 0,
				tiktok: 0,
				direct: 0,
			};

			const lastTouchRevenue = {
				facebook: 0,
				google: 0,
				tiktok: 0,
				direct: 0,
			};

			for (const session of sessions) {
				const value = Number(session.conversionValue ?? 0);

				// First-touch
				if (session.firstFbclid) {
					firstTouch.facebook++;
					firstTouchRevenue.facebook += value;
				} else if (session.firstGclid) {
					firstTouch.google++;
					firstTouchRevenue.google += value;
				} else if (session.firstTtclid) {
					firstTouch.tiktok++;
					firstTouchRevenue.tiktok += value;
				} else {
					firstTouch.direct++;
					firstTouchRevenue.direct += value;
				}

				// Last-touch
				if (session.lastFbclid) {
					lastTouch.facebook++;
					lastTouchRevenue.facebook += value;
				} else if (session.lastGclid) {
					lastTouch.google++;
					lastTouchRevenue.google += value;
				} else if (session.lastTtclid) {
					lastTouch.tiktok++;
					lastTouchRevenue.tiktok += value;
				} else {
					lastTouch.direct++;
					lastTouchRevenue.direct += value;
				}
			}

			return {
				firstTouch: {
					conversions: firstTouch,
					revenue: firstTouchRevenue,
				},
				lastTouch: {
					conversions: lastTouch,
					revenue: lastTouchRevenue,
				},
				total: sessions.length,
			};
		}),

	/**
	 * Get ad spend summary stats
	 */
	getSummary: protectedProcedure
		.input(
			z.object({
				funnelId: z.string().optional(),
				startDate: z.string(),
				endDate: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { funnelId, startDate, endDate } = input;

			const records = await db
				.select()
				.from(adSpend)
				.where(adSpendWhere({ organizationId: ctx.orgId!, locationId: ctx.locationId, funnelId, startDate, endDate }));

			const totals = records.reduce((acc, record) => {
				addAdRecord(acc, record);
				return acc;
			}, emptyMetrics());
			const derived = calculateDerivedMetrics(totals);

			return {
				...totals,
				...derived,
				profit: totals.revenue - totals.spend,
				profitMargin: totals.revenue > 0 ? ((totals.revenue - totals.spend) / totals.revenue) * 100 : 0,
			};
		}),
});
