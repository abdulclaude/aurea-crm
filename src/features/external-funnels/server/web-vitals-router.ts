import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import db from "@/lib/db";

export const webVitalsRouter = createTRPCRouter({
	/**
	 * Get web vitals for a funnel
	 */
	getWebVitals: protectedProcedure
		.input(
			z.object({
				funnelId: z.string(),
				metric: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB", "FID"]).optional(),
				rating: z.enum(["GOOD", "NEEDS_IMPROVEMENT", "POOR"]).optional(),
				pageUrl: z.string().optional(),
				deviceType: z.string().optional(),
				timestampStart: z.date().optional(),
				timestampEnd: z.date().optional(),
				cursor: z.string().optional(),
				limit: z.number().min(1).max(100).default(50),
			}),
		)
		.query(async ({ input }) => {
			const {
				funnelId,
				metric,
				rating,
				pageUrl,
				deviceType,
				timestampStart,
				timestampEnd,
				cursor,
				limit,
			} = input;

			const webVitals = await db.funnelWebVital.findMany({
				where: {
					funnelId,
					metric,
					rating,
					pageUrl: pageUrl ? { contains: pageUrl } : undefined,
					deviceType,
					timestamp: {
						gte: timestampStart,
						lte: timestampEnd,
					},
				},
				orderBy: {
					timestamp: "desc",
				},
				take: limit + 1,
				cursor: cursor ? { id: cursor } : undefined,
			});

			let nextCursor: string | undefined = undefined;
			if (webVitals.length > limit) {
				const nextItem = webVitals.pop();
				nextCursor = nextItem?.id;
			}

			return {
				webVitals,
				nextCursor,
			};
		}),

	/**
	 * Get web vitals statistics (percentiles, averages)
	 */
	getWebVitalsStats: protectedProcedure
		.input(
			z.object({
				funnelId: z.string(),
				timestampStart: z.date().optional(),
				timestampEnd: z.date().optional(),
			}),
		)
		.query(async ({ input }) => {
			const { funnelId, timestampStart, timestampEnd } = input;

			// Get all web vitals for the period
			const webVitals = await db.funnelWebVital.findMany({
				where: {
					funnelId,
					timestamp: {
						gte: timestampStart,
						lte: timestampEnd,
					},
				},
				select: {
					metric: true,
					value: true,
					rating: true,
				},
			});

			// Group by metric
			type VitalData = { metric: string; value: number; rating: string };
			const metricGroups = webVitals.reduce<Record<string, VitalData[]>>(
				(acc, vital) => {
					if (!acc[vital.metric]) {
						acc[vital.metric] = [];
					}
					acc[vital.metric].push(vital as VitalData);
					return acc;
				},
				{},
			);

			// Calculate stats for each metric
			const stats = Object.entries(metricGroups).map(([metric, vitals]) => {
				const values = vitals.map((v: VitalData) => v.value).sort((a: number, b: number) => a - b);
				const total = values.length;

				// Calculate percentiles
				const p50 = values[Math.floor(total * 0.5)] || 0;
				const p75 = values[Math.floor(total * 0.75)] || 0;
				const p90 = values[Math.floor(total * 0.9)] || 0;
				const p95 = values[Math.floor(total * 0.95)] || 0;

				// Calculate average
				const avg = values.reduce((sum: number, val: number) => sum + val, 0) / total;

				// Count by rating
				const goodCount = vitals.filter((v: VitalData) => v.rating === "GOOD").length;
				const needsImprovementCount = vitals.filter(
					(v: VitalData) => v.rating === "NEEDS_IMPROVEMENT",
				).length;
				const poorCount = vitals.filter((v: VitalData) => v.rating === "POOR").length;

				// Calculate percentages
				const goodPercent = (goodCount / total) * 100;
				const needsImprovementPercent = (needsImprovementCount / total) * 100;
				const poorPercent = (poorCount / total) * 100;

				return {
					metric,
					total,
					avg,
					p50,
					p75,
					p90,
					p95,
					min: values[0] || 0,
					max: values[values.length - 1] || 0,
					goodCount,
					needsImprovementCount,
					poorCount,
					goodPercent,
					needsImprovementPercent,
					poorPercent,
				};
			});

			// Overall passing rate (all metrics good)
			const totalVitals = webVitals.length;
			const passingVitals = webVitals.filter((v) => v.rating === "GOOD").length;
			const passingRate = totalVitals > 0 ? (passingVitals / totalVitals) * 100 : 0;

			return {
				stats,
				passingRate,
				totalVitals,
			};
		}),

	/**
	 * Get unique values for filters (pages, devices, etc.)
	 */
	getWebVitalsFilters: protectedProcedure
		.input(
			z.object({
				funnelId: z.string(),
			}),
		)
		.query(async ({ input }) => {
			const { funnelId } = input;

			const webVitals = await db.funnelWebVital.findMany({
				where: { funnelId },
				select: {
					pageUrl: true,
					pagePath: true,
					deviceType: true,
					browserName: true,
					countryName: true,
				},
				distinct: ["pageUrl", "deviceType", "browserName", "countryName"],
			});

			const pages = [
				...new Set(webVitals.map((v) => v.pageUrl).filter(Boolean)),
			].sort() as string[];
			const devices = [
				...new Set(webVitals.map((v) => v.deviceType).filter(Boolean)),
			].sort() as string[];
			const browsers = [
				...new Set(webVitals.map((v) => v.browserName).filter(Boolean)),
			].sort() as string[];
			const countries = [
				...new Set(webVitals.map((v) => v.countryName).filter(Boolean)),
			].sort() as string[];

			return {
				pages,
				devices,
				browsers,
				countries,
			};
		}),
});
