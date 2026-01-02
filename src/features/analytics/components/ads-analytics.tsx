"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatPercentage, getROASColor } from "@/lib/ads/calculate-roas";
import { subDays } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

interface AdsAnalyticsProps {
	funnelId: string;
}

export function AdsAnalytics({ funnelId }: AdsAnalyticsProps) {
	const trpc = useTRPC();
	
	// Date range state (default: last 30 days)
	const [dateRange, setDateRange] = useState({
		startDate: subDays(new Date(), 30).toISOString().split("T")[0],
		endDate: new Date().toISOString().split("T")[0],
	});

	// Platform filter
	const [platform, setPlatform] = useState<"all" | "facebook" | "google" | "tiktok">("all");

	// Queries
	// @ts-ignore - TypeScript cache issue, ads router exists at runtime
	const { data: summary, isLoading: loadingSummary } = useQuery(
		trpc.ads.getSummary.queryOptions({
			funnelId,
			startDate: dateRange.startDate,
			endDate: dateRange.endDate,
		})
	);

	// @ts-ignore - TypeScript cache issue, ads router exists at runtime
	const { data: platforms, isLoading: loadingPlatforms } = useQuery(
		trpc.ads.getSpendByPlatform.queryOptions({
			funnelId,
			startDate: dateRange.startDate,
			endDate: dateRange.endDate,
			platform,
		})
	);

	// @ts-ignore - TypeScript cache issue, ads router exists at runtime
	const { data: chartData, isLoading: loadingChart } = useQuery(
		trpc.ads.getROASChart.queryOptions({
			funnelId,
			startDate: dateRange.startDate,
			endDate: dateRange.endDate,
			platform,
			groupBy: "day",
		})
	);

	// @ts-ignore - TypeScript cache issue, ads router exists at runtime
	const { data: campaigns, isLoading: loadingCampaigns } = useQuery(
		trpc.ads.getTopCampaigns.queryOptions({
			funnelId,
			startDate: dateRange.startDate,
			endDate: dateRange.endDate,
			platform,
			orderBy: "roas",
			limit: 10,
		})
	);

	// @ts-ignore - TypeScript cache issue, ads router exists at runtime
	const { data: attribution, isLoading: loadingAttribution } = useQuery(
		trpc.ads.getAttributionBreakdown.queryOptions({
			funnelId,
			startDate: dateRange.startDate,
			endDate: dateRange.endDate,
		})
	);

	return (
		<div className="space-y-6">
			{/* Date Range & Platform Filter */}
			<div className="flex items-center gap-4">
				<input
					type="date"
					value={dateRange.startDate}
					onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
					className="px-4 py-2 rounded-lg border bg-background"
				/>
				<span>to</span>
				<input
					type="date"
					value={dateRange.endDate}
					onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
					className="px-4 py-2 rounded-lg border bg-background"
				/>

				<select
					value={platform}
					onChange={(e) => setPlatform(e.target.value as typeof platform)}
					className="px-4 py-2 rounded-lg border bg-background"
				>
					<option value="all">All Platforms</option>
					<option value="facebook">Meta/Facebook</option>
					<option value="google">Google Ads</option>
					<option value="tiktok">TikTok</option>
				</select>
			</div>

			{/* Summary Stats */}
			{loadingSummary ? (
				<div>Loading summary...</div>
			) : summary ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<Card className="p-4">
						<div className="text-sm text-muted-foreground">Total Spend</div>
						<div className="text-2xl font-bold">{formatCurrency(summary.spend)}</div>
					</Card>
					<Card className="p-4">
						<div className="text-sm text-muted-foreground">Total Revenue</div>
						<div className="text-2xl font-bold">{formatCurrency(summary.revenue)}</div>
					</Card>
					<Card className="p-4">
						<div className="text-sm text-muted-foreground">ROAS</div>
						<div className={`text-2xl font-bold ${getROASColor(summary.roas)}`}>
							{formatPercentage(summary.roas)}
						</div>
					</Card>
					<Card className="p-4">
						<div className="text-sm text-muted-foreground">Profit</div>
						<div className={`text-2xl font-bold ${summary.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
							{formatCurrency(summary.profit)}
						</div>
					</Card>
				</div>
			) : null}

			{/* Tabs */}
			<Tabs defaultValue="overview" className="space-y-6">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="campaigns">Campaigns</TabsTrigger>
					<TabsTrigger value="attribution">Attribution</TabsTrigger>
				</TabsList>

				{/* Overview Tab */}
				<TabsContent value="overview" className="space-y-6">
					{/* Platform Performance Table */}
					<Card className="p-6">
						<h2 className="text-lg font-semibold mb-4">Platform Performance</h2>
						{loadingPlatforms ? (
							<div>Loading platforms...</div>
						) : platforms?.platforms && platforms.platforms.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b">
											<th className="text-left py-2">Platform</th>
											<th className="text-right py-2">Spend</th>
											<th className="text-right py-2">Revenue</th>
											<th className="text-right py-2">ROAS</th>
											<th className="text-right py-2">Conversions</th>
											<th className="text-right py-2">CPA</th>
										</tr>
									</thead>
									<tbody>
										{platforms.platforms.map((p: any) => (
											<tr key={p.platform} className="border-b">
												<td className="py-2 capitalize">{p.platform}</td>
												<td className="text-right">{formatCurrency(p.spend)}</td>
												<td className="text-right">{formatCurrency(p.revenue)}</td>
												<td className={`text-right ${getROASColor(p.roas)}`}>
													{formatPercentage(p.roas)}
												</td>
												<td className="text-right">{p.conversions}</td>
												<td className="text-right">{formatCurrency(p.cpa)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								No ad spend data available for this period. 
								<br />
								Run your first test campaign to see metrics here!
							</div>
						)}
					</Card>

					{/* ROAS Chart */}
					<Card className="p-6">
						<h2 className="text-lg font-semibold mb-4">ROAS Over Time</h2>
						{loadingChart ? (
							<div>Loading chart...</div>
						) : chartData && chartData.length > 0 ? (
							<div className="h-64 flex items-end gap-2">
								{chartData.map((day: any) => {
									const maxROAS = Math.max(...chartData.map((d: any) => d.roas));
									const height = maxROAS > 0 ? (day.roas / maxROAS) * 100 : 0;
									
									return (
										<div key={day.date} className="flex-1 flex flex-col items-center gap-1">
											<div
												className={`w-full rounded-t ${getROASColor(day.roas).replace("text-", "bg-")}`}
												style={{ height: `${height}%` }}
												title={`${day.date}: ${formatPercentage(day.roas)}`}
											/>
											<div className="text-xs text-muted-foreground">{new Date(day.date).getDate()}</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								No data available for chart
							</div>
						)}
					</Card>
				</TabsContent>

				{/* Campaigns Tab */}
				<TabsContent value="campaigns" className="space-y-6">
					<Card className="p-6">
						<h2 className="text-lg font-semibold mb-4">Top Performing Campaigns</h2>
						{loadingCampaigns ? (
							<div>Loading campaigns...</div>
						) : campaigns && campaigns.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b">
											<th className="text-left py-2">Campaign</th>
											<th className="text-right py-2">Platform</th>
											<th className="text-right py-2">Spend</th>
											<th className="text-right py-2">Revenue</th>
											<th className="text-right py-2">ROAS</th>
											<th className="text-right py-2">Conversions</th>
										</tr>
									</thead>
									<tbody>
										{campaigns.map((c: any, i: number) => (
											<tr key={i} className="border-b">
												<td className="py-2">{c.campaignName}</td>
												<td className="text-right capitalize">{c.platform}</td>
												<td className="text-right">{formatCurrency(c.spend)}</td>
												<td className="text-right">{formatCurrency(c.revenue)}</td>
												<td className={`text-right ${getROASColor(c.roas)}`}>
													{formatPercentage(c.roas)}
												</td>
												<td className="text-right">{c.conversions}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								No campaigns found
							</div>
						)}
					</Card>
				</TabsContent>

				{/* Attribution Tab */}
				<TabsContent value="attribution" className="space-y-6">
					<Card className="p-6">
						<h2 className="text-lg font-semibold mb-4">Attribution Breakdown</h2>
						<p className="text-sm text-muted-foreground mb-4">
							Compare first-touch vs last-touch attribution
						</p>
						{loadingAttribution ? (
							<div>Loading attribution...</div>
						) : attribution ? (
							<div className="grid grid-cols-2 gap-6">
								{/* First Touch */}
								<div>
									<h3 className="font-semibold mb-2">First Touch Attribution</h3>
									<div className="space-y-2">
										<div className="flex justify-between">
											<span>Meta/Facebook:</span>
											<span>{attribution.firstTouch.conversions.facebook} conversions</span>
										</div>
										<div className="flex justify-between">
											<span>Google Ads:</span>
											<span>{attribution.firstTouch.conversions.google} conversions</span>
										</div>
										<div className="flex justify-between">
											<span>TikTok:</span>
											<span>{attribution.firstTouch.conversions.tiktok} conversions</span>
										</div>
										<div className="flex justify-between">
											<span>Direct:</span>
											<span>{attribution.firstTouch.conversions.direct} conversions</span>
										</div>
									</div>
								</div>

								{/* Last Touch */}
								<div>
									<h3 className="font-semibold mb-2">Last Touch Attribution</h3>
									<div className="space-y-2">
										<div className="flex justify-between">
											<span>Meta/Facebook:</span>
											<span>{attribution.lastTouch.conversions.facebook} conversions</span>
										</div>
										<div className="flex justify-between">
											<span>Google Ads:</span>
											<span>{attribution.lastTouch.conversions.google} conversions</span>
										</div>
										<div className="flex justify-between">
											<span>TikTok:</span>
											<span>{attribution.lastTouch.conversions.tiktok} conversions</span>
										</div>
										<div className="flex justify-between">
											<span>Direct:</span>
											<span>{attribution.lastTouch.conversions.direct} conversions</span>
										</div>
									</div>
								</div>
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								No attribution data available
							</div>
						)}
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
