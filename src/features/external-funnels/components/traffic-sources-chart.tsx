"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ChartTableToggle } from "@/components/chart-table-toggle";
import { useTRPC } from "@/trpc/client";

const COLORS = [
	"hsl(var(--chart-1))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
	"#8884d8",
	"#82ca9d",
	"#ffc658",
	"#ff7c7c",
	"#a78bfa",
];

type TrafficSourcesChartProps = {
	funnelId: string;
};

export function TrafficSourcesChart({ funnelId }: TrafficSourcesChartProps) {
	const trpc = useTRPC();
	const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");
	const [view, setView] = useQueryState(
		"sourcesView",
		parseAsString.withDefault("table")
	);

	const handleViewChange = React.useCallback((newView: "chart" | "table") => {
		setView(newView);
	}, [setView]);

	const { data, isFetching } = useSuspenseQuery(
		trpc.externalFunnels.getTrafficSources.queryOptions({
			funnelId,
			timeRange,
			limit: 50,
		}),
	);

	const trafficSources = data?.trafficSources || [];

	// Aggregate by source for pie chart
	const sourceData = React.useMemo(() => {
		const sourceMap = new Map<
			string,
			{ source: string; sessions: number; revenue: number }
		>();

		for (const item of trafficSources) {
			const existing = sourceMap.get(item.source);
			if (existing) {
				existing.sessions += item.sessions;
				existing.revenue += item.revenue;
			} else {
				sourceMap.set(item.source, {
					source: item.source,
					sessions: item.sessions,
					revenue: item.revenue,
				});
			}
		}

		return Array.from(sourceMap.values())
			.sort((a, b) => b.sessions - a.sessions)
			.slice(0, 10);
	}, [trafficSources]);

	// Top sources for bar chart
	const topSources = React.useMemo(() => {
		return trafficSources
			.sort((a, b) => b.sessions - a.sessions)
			.slice(0, 10);
	}, [trafficSources]);

	const chartConfig = {
		sessions: {
			label: "Sessions",
			color: "hsl(var(--chart-1))",
		},
		revenue: {
			label: "Revenue",
			color: "hsl(var(--chart-2))",
		},
	} satisfies ChartConfig;

	const totalSessions = sourceData.reduce((sum, item) => sum + item.sessions, 0);

	return (
		<div className="space-y-6 pt-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h3 className="text-sm font-semibold text-primary">
						Traffic Sources
					</h3>
					<Badge variant="secondary" className="text-xs">
						{trafficSources.length} sources
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<ChartTableToggle
						view={view as "chart" | "table"}
						onViewChange={handleViewChange}
					/>
					<Select
						value={timeRange}
						onValueChange={(v) => setTimeRange(v as typeof timeRange)}
					>
						<SelectTrigger className="w-[140px] h-8 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="7d" className="text-xs">
								Last 7 days
							</SelectItem>
							<SelectItem value="30d" className="text-xs">
								Last 30 days
							</SelectItem>
							<SelectItem value="90d" className="text-xs">
								Last 90 days
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{trafficSources.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
					No traffic sources found. <br /> Data will appear once events start
					coming in.
				</div>
			) : (
				<div className="grid gap-6 md:grid-cols-2">
					{/* Pie Chart - Traffic Distribution */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Traffic Distribution</CardTitle>
							<CardDescription className="text-xs">
								Session breakdown by source
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={chartConfig} className="h-[300px]">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={sourceData}
											dataKey="sessions"
											nameKey="source"
											cx="50%"
											cy="50%"
											outerRadius={80}
											label={({ source, sessions }) =>
												`${source}: ${sessions}`
											}
											labelLine
										>
											{sourceData.map((entry, index) => (
												<Cell
													key={`cell-${entry.source}`}
													fill={COLORS[index % COLORS.length]}
												/>
											))}
										</Pie>
										<ChartTooltip
											content={
												<ChartTooltipContent
													formatter={(value, name) => (
														<div className="flex items-center justify-between gap-4">
															<span className="text-xs text-muted-foreground">
																{name}
															</span>
															<span className="text-xs font-mono font-semibold">
																{value.toLocaleString()} sessions
															</span>
														</div>
													)}
												/>
											}
										/>
										<Legend
											verticalAlign="bottom"
											height={36}
											wrapperStyle={{ fontSize: '12px' }}
										/>
									</PieChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>

					{/* Bar Chart - Top Sources */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Top Traffic Sources</CardTitle>
							<CardDescription className="text-xs">
								Sessions by source, medium, and campaign
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={chartConfig} className="h-[300px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={topSources}>
										<defs>
											<linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
												<stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
										<XAxis
											dataKey="source"
											tick={{ fontSize: 10 }}
											className="text-xs"
										/>
										<YAxis tick={{ fontSize: 10 }} className="text-xs" />
										<ChartTooltip
											content={
												<ChartTooltipContent
													formatter={(value, name, props) => {
														const item = props.payload;
														return (
															<div className="space-y-1">
																<div className="flex items-center justify-between gap-4">
																	<span className="text-xs text-muted-foreground">
																		Source:
																	</span>
																	<span className="text-xs font-semibold">
																		{item.source}
																	</span>
																</div>
																<div className="flex items-center justify-between gap-4">
																	<span className="text-xs text-muted-foreground">
																		Medium:
																	</span>
																	<span className="text-xs font-semibold">
																		{item.medium}
																	</span>
																</div>
																<div className="flex items-center justify-between gap-4">
																	<span className="text-xs text-muted-foreground">
																		Campaign:
																	</span>
																	<span className="text-xs font-semibold">
																		{item.campaign}
																	</span>
																</div>
																<div className="flex items-center justify-between gap-4">
																	<span className="text-xs text-muted-foreground">
																		Sessions:
																	</span>
																	<span className="text-xs font-mono font-semibold">
																		{value.toLocaleString()}
																	</span>
																</div>
																{item.revenue > 0 && (
																	<div className="flex items-center justify-between gap-4">
																		<span className="text-xs text-muted-foreground">
																			Revenue:
																		</span>
																		<span className="text-xs font-mono font-semibold text-green-600">
																			${Number(item.revenue).toFixed(2)}
																		</span>
																	</div>
																)}
															</div>
														);
													}}
												/>
											}
										/>
										<Bar
											dataKey="sessions"
											fill="url(#sessionGradient)"
											radius={[8, 8, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
