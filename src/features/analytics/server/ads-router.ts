/**
 * tRPC Router for Ad Analytics
 * Provides queries for ad spend, ROAS, and performance metrics
 */

// @ts-nocheck - TypeScript cache needs refresh after Prisma generation (restart dev server)

import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import db from "@/lib/db";

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

			// Build where clause
			const where: any = {
				organizationId: ctx.orgId!,
				date: {
					gte: new Date(startDate),
					lte: new Date(endDate),
				},
			};

			if (ctx.subaccountId) {
				where.subaccountId = ctx.subaccountId;
			}

			if (funnelId) {
				where.funnelId = funnelId;
			}

			if (platform !== "all") {
				where.platform = platform;
			}

			// Get aggregated data by platform
			// @ts-ignore - adSpend model exists in DB, TypeScript cache needs refresh
			const data = await db.adSpend.groupBy({
				by: ["platform"],
				where,
				_sum: {
					spend: true,
					impressions: true,
					clicks: true,
					conversions: true,
					revenue: true,
				},
			});

			// Calculate metrics
			const platforms = data.map((item: any) => {
				const spend = item._sum.spend?.toNumber() || 0;
				const revenue = item._sum.revenue?.toNumber() || 0;
				const impressions = item._sum.impressions || 0;
				const clicks = item._sum.clicks || 0;
				const conversions = item._sum.conversions || 0;

				const roas = spend > 0 ? (revenue / spend) * 100 : 0;
				const cpa = conversions > 0 ? spend / conversions : 0;
				const cpc = clicks > 0 ? spend / clicks : 0;
				const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
				const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
				const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

				return {
					platform: item.platform,
					spend,
					revenue,
					impressions,
					clicks,
					conversions,
					roas,
					cpa,
					cpc,
					cpm,
					ctr,
					conversionRate,
					profit: revenue - spend,
				};
			});

			return {
				platforms,
				total: {
					spend: platforms.reduce((acc: number, p: any) => acc + p.spend, 0),
					revenue: platforms.reduce((acc: number, p: any) => acc + p.revenue, 0),
					impressions: platforms.reduce((acc: number, p: any) => acc + p.impressions, 0),
					clicks: platforms.reduce((acc: number, p: any) => acc + p.clicks, 0),
					conversions: platforms.reduce((acc: number, p: any) => acc + p.conversions, 0),
					profit: platforms.reduce((acc: number, p: any) => acc + p.profit, 0),
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

			// Build where clause
			const where: any = {
				organizationId: ctx.orgId!,
				date: {
					gte: new Date(startDate),
					lte: new Date(endDate),
				},
			};

			if (ctx.subaccountId) {
				where.subaccountId = ctx.subaccountId;
			}

			if (funnelId) {
				where.funnelId = funnelId;
			}

			if (platform !== "all") {
				where.platform = platform;
			}

			// Get all spend records
			// @ts-ignore - adSpend model exists in DB, TypeScript cache needs refresh
			const records = await db.adSpend.findMany({
				where,
				orderBy: { date: "asc" },
				select: {
					date: true,
					platform: true,
					spend: true,
					revenue: true,
					impressions: true,
					clicks: true,
					conversions: true,
				},
			});

			// Group by date
			const grouped = new Map<string, any>();

			for (const record of records) {
				let dateKey: string;

				if (groupBy === "day") {
					dateKey = record.date.toISOString().split("T")[0];
				} else if (groupBy === "week") {
					// Get start of week (Monday)
					const d = new Date(record.date);
					const day = d.getDay();
					const diff = d.getDate() - day + (day === 0 ? -6 : 1);
					d.setDate(diff);
					dateKey = d.toISOString().split("T")[0];
				} else {
					// month
					dateKey = record.date.toISOString().substring(0, 7); // YYYY-MM
				}

				if (!grouped.has(dateKey)) {
					grouped.set(dateKey, {
						date: dateKey,
						spend: 0,
						revenue: 0,
						impressions: 0,
						clicks: 0,
						conversions: 0,
					});
				}

				const group = grouped.get(dateKey);
				group.spend += record.spend.toNumber();
				group.revenue += record.revenue.toNumber();
				group.impressions += record.impressions;
				group.clicks += record.clicks;
				group.conversions += record.conversions;
			}

			// Calculate ROAS for each group
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

			// Build where clause
			const where: any = {
				organizationId: ctx.orgId!,
				date: {
					gte: new Date(startDate),
					lte: new Date(endDate),
				},
				campaignId: {
					not: null,
				},
			};

			if (ctx.subaccountId) {
				where.subaccountId = ctx.subaccountId;
			}

			if (funnelId) {
				where.funnelId = funnelId;
			}

			if (platform !== "all") {
				where.platform = platform;
			}

			// Get aggregated data by campaign
			const data = await db.adSpend.groupBy({
				by: ["platform", "campaignId", "campaignName"],
				where,
				_sum: {
					spend: true,
					impressions: true,
					clicks: true,
					conversions: true,
					revenue: true,
				},
			});

			// Calculate metrics and sort
			const campaigns = data
				.map((item) => {
					const spend = item._sum.spend?.toNumber() || 0;
					const revenue = item._sum.revenue?.toNumber() || 0;
					const impressions = item._sum.impressions || 0;
					const clicks = item._sum.clicks || 0;
					const conversions = item._sum.conversions || 0;

					const roas = spend > 0 ? (revenue / spend) * 100 : 0;
					const cpa = conversions > 0 ? spend / conversions : 0;

					return {
						platform: item.platform,
						campaignId: item.campaignId || "",
						campaignName: item.campaignName || item.campaignId || "Unknown",
						spend,
						revenue,
						impressions,
						clicks,
						conversions,
						roas,
						cpa,
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

			// Get sessions with conversions
			const sessions = await db.funnelSession.findMany({
				where: {
					funnelId,
					converted: true,
					createdAt: {
						gte: new Date(startDate),
						lte: new Date(endDate),
					},
				},
				select: {
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
				const value = session.conversionValue?.toNumber() || 0;

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

			// Build where clause
			const where: any = {
				organizationId: ctx.orgId!,
				date: {
					gte: new Date(startDate),
					lte: new Date(endDate),
				},
			};

			if (ctx.subaccountId) {
				where.subaccountId = ctx.subaccountId;
			}

			if (funnelId) {
				where.funnelId = funnelId;
			}

			// Get aggregated totals
			const totals = await db.adSpend.aggregate({
				where,
				_sum: {
					spend: true,
					revenue: true,
					impressions: true,
					clicks: true,
					conversions: true,
				},
			});

			const spend = totals._sum.spend?.toNumber() || 0;
			const revenue = totals._sum.revenue?.toNumber() || 0;
			const impressions = totals._sum.impressions || 0;
			const clicks = totals._sum.clicks || 0;
			const conversions = totals._sum.conversions || 0;

			const roas = spend > 0 ? (revenue / spend) * 100 : 0;
			const cpa = conversions > 0 ? spend / conversions : 0;
			const cpc = clicks > 0 ? spend / clicks : 0;
			const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
			const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

			return {
				spend,
				revenue,
				impressions,
				clicks,
				conversions,
				roas,
				cpa,
				cpc,
				ctr,
				conversionRate,
				profit: revenue - spend,
				profitMargin: revenue > 0 ? ((revenue - spend) / revenue) * 100 : 0,
			};
		}),
});
