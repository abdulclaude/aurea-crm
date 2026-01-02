"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/ads/calculate-roas";
import { TrendingUp, DollarSign, Target, BarChart3 } from "lucide-react";

interface AdsAnalyticsSimpleProps {
	funnelId: string;
}

export function AdsAnalyticsSimple({ funnelId }: AdsAnalyticsSimpleProps) {
	const trpc = useTRPC();
	
	// Time range filter
	const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "all">("7d");

	// Get conversion data grouped by platform
	const { data, isLoading } = useQuery(
		trpc.externalFunnels.getConversionsByPlatform.queryOptions({
			funnelId,
			timeRange,
		})
	);

	if (isLoading) {
		return <div className="p-6">Loading ad performance...</div>;
	}

	if (!data) {
		return <div className="p-6">No data available</div>;
	}

	const { summary, platforms, attribution, campaigns } = data;

	return (
		<div className="space-y-6">
			{/* Time Range Filter */}
			<div className="flex items-center gap-4">
				<select
					value={timeRange}
					onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
					className="px-4 py-2 rounded-lg border bg-background"
				>
					<option value="24h">Last 24 Hours</option>
					<option value="7d">Last 7 Days</option>
					<option value="30d">Last 30 Days</option>
					<option value="all">All Time</option>
				</select>
			</div>

			{/* Summary Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card className="p-6">
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-blue-500/10">
							<Target className="w-6 h-6 text-blue-500" />
						</div>
						<div>
							<div className="text-sm text-muted-foreground">Total Conversions</div>
							<div className="text-2xl font-bold">{summary.totalConversions}</div>
						</div>
					</div>
				</Card>

				<Card className="p-6">
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-green-500/10">
							<DollarSign className="w-6 h-6 text-green-500" />
						</div>
						<div>
							<div className="text-sm text-muted-foreground">Total Revenue</div>
							<div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
						</div>
					</div>
				</Card>

				<Card className="p-6">
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-purple-500/10">
							<TrendingUp className="w-6 h-6 text-purple-500" />
						</div>
						<div>
							<div className="text-sm text-muted-foreground">Avg Order Value</div>
							<div className="text-2xl font-bold">
								{formatCurrency(summary.averageOrderValue)}
							</div>
						</div>
					</div>
				</Card>
			</div>

			{/* Tabs */}
			<Tabs defaultValue="platforms" className="space-y-6">
				<TabsList>
					<TabsTrigger value="platforms">Platforms</TabsTrigger>
					<TabsTrigger value="campaigns">Campaigns</TabsTrigger>
					<TabsTrigger value="attribution">Attribution</TabsTrigger>
				</TabsList>

				{/* Platforms Tab */}
				<TabsContent value="platforms" className="space-y-6">
					<Card className="p-6">
						<h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
							<BarChart3 className="w-5 h-5" />
							Platform Performance
						</h2>
						{platforms && platforms.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b">
											<th className="text-left py-3 px-4">Platform</th>
											<th className="text-right py-3 px-4">Conversions</th>
											<th className="text-right py-3 px-4">Revenue</th>
											<th className="text-right py-3 px-4">Avg Order Value</th>
											<th className="text-right py-3 px-4">First Touch</th>
											<th className="text-right py-3 px-4">Last Touch</th>
										</tr>
									</thead>
									<tbody>
										{platforms.map((p: any) => (
											<tr key={p.platform} className="border-b hover:bg-muted/50">
												<td className="py-3 px-4">
													<div className="flex items-center gap-2">
														<div className={`w-2 h-2 rounded-full ${
															p.platform === 'facebook' ? 'bg-blue-500' :
															p.platform === 'google' ? 'bg-yellow-500' :
															p.platform === 'tiktok' ? 'bg-pink-500' :
															'bg-gray-500'
														}`} />
														<span className="font-medium capitalize">
															{p.platform === 'facebook' ? 'Meta/Facebook' : p.platform}
														</span>
													</div>
												</td>
												<td className="text-right py-3 px-4">{p.conversions}</td>
												<td className="text-right py-3 px-4 font-medium">
													{formatCurrency(p.revenue)}
												</td>
												<td className="text-right py-3 px-4">
													{formatCurrency(p.averageOrderValue)}
												</td>
												<td className="text-right py-3 px-4">{p.firstTouch}</td>
												<td className="text-right py-3 px-4">{p.lastTouch}</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr className="border-t-2 font-semibold">
											<td className="py-3 px-4">Total</td>
											<td className="text-right py-3 px-4">{summary.totalConversions}</td>
											<td className="text-right py-3 px-4">{formatCurrency(summary.totalRevenue)}</td>
											<td className="text-right py-3 px-4">{formatCurrency(summary.averageOrderValue)}</td>
											<td className="text-right py-3 px-4">-</td>
											<td className="text-right py-3 px-4">-</td>
										</tr>
									</tfoot>
								</table>
							</div>
						) : (
							<div className="text-center py-12 text-muted-foreground">
								<Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
								<p className="text-lg font-medium">No conversions yet</p>
								<p className="text-sm">Start running ad campaigns to see performance data here</p>
							</div>
						)}
					</Card>
				</TabsContent>

				{/* Campaigns Tab */}
				<TabsContent value="campaigns" className="space-y-6">
					<Card className="p-6">
						<h2 className="text-lg font-semibold mb-4">Top Campaigns by Revenue</h2>
						{campaigns && campaigns.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b">
											<th className="text-left py-3 px-4">Campaign</th>
											<th className="text-right py-3 px-4">Platform</th>
											<th className="text-right py-3 px-4">Conversions</th>
											<th className="text-right py-3 px-4">Revenue</th>
										</tr>
									</thead>
									<tbody>
										{campaigns.map((c: any, i: number) => (
											<tr key={i} className="border-b hover:bg-muted/50">
												<td className="py-3 px-4 font-medium">{c.campaign}</td>
												<td className="text-right py-3 px-4 capitalize">{c.platform}</td>
												<td className="text-right py-3 px-4">{c.conversions}</td>
												<td className="text-right py-3 px-4 font-medium">
													{formatCurrency(c.revenue)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="text-center py-12 text-muted-foreground">
								<p>No campaign data available</p>
								<p className="text-sm mt-2">
									Make sure your UTM parameters include campaign names
								</p>
							</div>
						)}
					</Card>
				</TabsContent>

				{/* Attribution Tab */}
				<TabsContent value="attribution" className="space-y-6">
					<Card className="p-6">
						<h2 className="text-lg font-semibold mb-4">Attribution Model Comparison</h2>
						<p className="text-sm text-muted-foreground mb-6">
							Compare how conversions are attributed across first-touch and last-touch models
						</p>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							{/* First Touch */}
							<div>
								<h3 className="font-semibold mb-4 text-blue-500">First Touch Attribution</h3>
								<p className="text-xs text-muted-foreground mb-3">
									Credits the first ad interaction that led to a conversion
								</p>
								<div className="space-y-3">
								{Object.entries(attribution.firstTouch.conversions).map(([platform, count]: [string, number]) => (
									<div key={platform} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
										<div className="flex items-center gap-2">
											<div className={`w-2 h-2 rounded-full ${
												platform === 'facebook' ? 'bg-blue-500' :
												platform === 'google' ? 'bg-yellow-500' :
												platform === 'tiktok' ? 'bg-pink-500' :
												'bg-gray-500'
											}`} />
											<span className="capitalize font-medium">
												{platform === 'facebook' ? 'Meta/Facebook' : platform}
											</span>
										</div>
										<div className="text-right">
											<div className="font-semibold">{count}</div>
											<div className="text-xs text-muted-foreground">
												{formatCurrency((attribution.firstTouch.revenue as Record<string, number>)[platform] ?? 0)}
											</div>
										</div>
									</div>
								))}
								</div>
							</div>

							{/* Last Touch */}
							<div>
								<h3 className="font-semibold mb-4 text-green-500">Last Touch Attribution</h3>
								<p className="text-xs text-muted-foreground mb-3">
									Credits the last ad interaction before conversion
								</p>
								<div className="space-y-3">
								{Object.entries(attribution.lastTouch.conversions).map(([platform, count]: [string, number]) => (
									<div key={platform} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
										<div className="flex items-center gap-2">
											<div className={`w-2 h-2 rounded-full ${
												platform === 'facebook' ? 'bg-blue-500' :
												platform === 'google' ? 'bg-yellow-500' :
												platform === 'tiktok' ? 'bg-pink-500' :
												'bg-gray-500'
											}`} />
											<span className="capitalize font-medium">
												{platform === 'facebook' ? 'Meta/Facebook' : platform}
											</span>
										</div>
										<div className="text-right">
											<div className="font-semibold">{count}</div>
											<div className="text-xs text-muted-foreground">
												{formatCurrency((attribution.lastTouch.revenue as Record<string, number>)[platform] ?? 0)}
											</div>
										</div>
									</div>
								))}
								</div>
							</div>
						</div>
					</Card>

					{/* Attribution Insights */}
					<Card className="p-6 bg-blue-500/5 border-blue-500/20">
						<h3 className="font-semibold mb-2 flex items-center gap-2">
							<TrendingUp className="w-4 h-4 text-blue-500" />
							Attribution Insights
						</h3>
						<div className="text-sm space-y-2 text-muted-foreground">
							<p>
								• <strong>First Touch</strong> shows which platforms are best at bringing in NEW customers
							</p>
							<p>
								• <strong>Last Touch</strong> shows which platforms are best at CLOSING sales
							</p>
							<p>
								• Use both metrics to understand your full customer journey
							</p>
						</div>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Note about ad spend */}
			<Card className="p-4 bg-yellow-500/5 border-yellow-500/20">
				<p className="text-sm text-muted-foreground">
					<strong>Note:</strong> Currently showing conversion data only. 
					To see ROAS, CPA, and spend metrics, you'll need to import ad spend data from Meta/Google/TikTok.
				</p>
			</Card>
		</div>
	);
}
