"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import * as React from "react";
import {
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	ResponsiveContainer,
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
import { Globe, MapPin } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { RotatingGlobe } from "./rotating-globe";

const CHART_COLORS = [
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

type GeographyAnalyticsProps = {
	funnelId: string;
};

// Convert country code to flag emoji
const getCountryFlag = (countryCode: string) => {
	if (!countryCode || countryCode === "Unknown" || countryCode.length !== 2) {
		return "🌍";
	}
	const codePoints = countryCode
		.toUpperCase()
		.split("")
		.map((char) => 127397 + char.charCodeAt(0));
	return String.fromCodePoint(...codePoints);
};

export function GeographyAnalytics({ funnelId }: GeographyAnalyticsProps) {
	const trpc = useTRPC();
	const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");

	const { data, isFetching } = useSuspenseQuery(
		trpc.externalFunnels.getGeographyAnalytics.queryOptions({
			funnelId,
			timeRange,
		}),
	);

	const chartConfig = {
		sessions: {
			label: "Sessions",
			color: "hsl(var(--chart-1))",
		},
	} satisfies ChartConfig;

	// Top 10 countries for pie chart
	const topCountries = React.useMemo(() => {
		return data.countries.slice(0, 10);
	}, [data.countries]);

	return (
		<div className="space-y-6 pt-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Globe className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-semibold text-primary">
						Geography Analytics
					</h3>
					<Badge variant="secondary" className="text-xs">
						{data.totalSessions.toLocaleString()} sessions
					</Badge>
				</div>
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

			{/* Summary Cards */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="text-xs">Total Countries</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{data.countries.length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="text-xs">Total Cities</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{data.cities.length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="text-xs">Conversions</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							{data.totalConversions.toLocaleString()}
						</div>
					</CardContent>
				</Card>
			</div>

			{data.totalSessions === 0 ? (
				<div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
					No geography data found. <br /> Data will appear once sessions start
					coming in.
				</div>
			) : (
				<div className="space-y-6">
					{/* 3D Rotating Globe */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Global Activity Map</CardTitle>
							<CardDescription className="text-xs">
								Interactive world map showing countries with active sessions
							</CardDescription>
						</CardHeader>
						<CardContent className="p-6">
							<div className="w-full h-[800px]">
								<RotatingGlobe countries={data.countries} funnelId={funnelId} />
							</div>
						</CardContent>
					</Card>

					<div className="grid gap-6 md:grid-cols-2">
					{/* Donut Chart - Top Countries */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Top Countries</CardTitle>
							<CardDescription className="text-xs">
								Session distribution by country
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={chartConfig} className="h-[350px]">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={topCountries}
											dataKey="sessions"
											nameKey="countryCode"
											cx="50%"
											cy="50%"
											innerRadius={70}
											outerRadius={110}
											paddingAngle={2}
											label={({ countryCode, countryName, percentage }) =>
												`${getCountryFlag(countryCode)} ${countryName || countryCode} ${percentage}%`
											}
										>
											{topCountries.map((entry, index) => (
												<Cell
													key={`cell-${entry.countryCode}`}
													fill={CHART_COLORS[index % CHART_COLORS.length]}
												/>
											))}
										</Pie>
										<ChartTooltip
											content={
												<ChartTooltipContent
													formatter={(value, name, props) => {
														const item = props.payload;
														return (
															<div className="space-y-1">
																<div className="flex items-center justify-between gap-4">
																	<span className="text-xs text-muted-foreground">
																		Country:
																	</span>
																	<span className="text-xs font-semibold">
																		{getCountryFlag(item.countryCode)} {item.countryCode}
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
																<div className="flex items-center justify-between gap-4">
																	<span className="text-xs text-muted-foreground">
																		Percentage:
																	</span>
																	<span className="text-xs font-semibold">
																		{item.percentage}%
																	</span>
																</div>
																<div className="flex items-center justify-between gap-4">
																	<span className="text-xs text-muted-foreground">
																		Conversions:
																	</span>
																	<span className="text-xs font-semibold text-green-600">
																		{item.conversions.toLocaleString()}
																	</span>
																</div>
															</div>
														);
													}}
												/>
											}
										/>
										<Legend
											verticalAlign="bottom"
											height={48}
											wrapperStyle={{ fontSize: "12px" }}
											formatter={(value, entry: any) => {
												const country = topCountries.find(c => c.countryCode === value);
												return `${getCountryFlag(value)} ${country?.countryName || value}`;
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>

					{/* Bar Chart - Top Cities */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Top Cities</CardTitle>
							<CardDescription className="text-xs">
								Most active cities (Top 10)
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={chartConfig} className="h-[350px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data.cities.slice(0, 10)} layout="vertical">
										<defs>
											<linearGradient id="cityGradient" x1="0" y1="0" x2="1" y2="0">
												<stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
												<stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
										<XAxis type="number" tick={{ fontSize: 10 }} className="text-xs" />
										<YAxis
											type="category"
											dataKey="city"
											tick={{ fontSize: 10 }}
											className="text-xs"
											width={100}
										/>
										<ChartTooltip
											content={
												<ChartTooltipContent
													formatter={(value, name, props) => {
														const item = props.payload;
														return (
															<div className="space-y-1">
																<div className="flex items-center justify-between gap-4">
																	<span className="text-xs text-muted-foreground">
																		Country:
																	</span>
																	<span className="text-xs font-semibold">
																		{getCountryFlag(item.countryCode)} {item.countryName || item.countryCode}
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
																<div className="flex items-center justify-between gap-4">
																	<span className="text-xs text-muted-foreground">
																		Percentage:
																	</span>
																	<span className="text-xs font-semibold">
																		{item.percentage}%
																	</span>
																</div>
															</div>
														);
													}}
												/>
											}
										/>
										<Bar
											dataKey="sessions"
											fill="url(#cityGradient)"
											radius={[0, 4, 4, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>

					{/* Bar Chart - All Countries */}
					<Card className="md:col-span-2">
						<CardHeader>
							<CardTitle className="text-sm">All Countries</CardTitle>
							<CardDescription className="text-xs">
								Complete country breakdown
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={chartConfig} className="h-[400px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data.countries}>
										<defs>
											<linearGradient id="countryGradient" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.9} />
												<stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
										<XAxis
											dataKey="countryCode"
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
																		Country:
																	</span>
																	<span className="text-xs font-semibold">
																		{getCountryFlag(item.countryCode)} {item.countryCode}
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
																<div className="flex items-center justify-between gap-4">
																	<span className="text-xs text-muted-foreground">
																		Revenue:
																	</span>
																	<span className="text-xs font-semibold text-green-600">
																		${Number(item.revenue).toFixed(2)}
																	</span>
																</div>
															</div>
														);
													}}
												/>
											}
										/>
										<Bar
											dataKey="sessions"
											fill="url(#countryGradient)"
											radius={[8, 8, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>
					</div>
				</div>
			)}
		</div>
	);
}
