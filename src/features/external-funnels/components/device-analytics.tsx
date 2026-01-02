"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
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
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useTRPC } from "@/trpc/client";

const DEVICE_COLORS = {
	Desktop: "hsl(var(--chart-1))",
	Mobile: "hsl(var(--chart-2))",
	Tablet: "hsl(var(--chart-3))",
	Unknown: "hsl(var(--chart-5))",
};

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

type DeviceAnalyticsProps = {
	funnelId: string;
};

const getDeviceIcon = (deviceType: string) => {
	switch (deviceType.toLowerCase()) {
		case "desktop":
			return <Monitor className="h-4 w-4" />;
		case "mobile":
			return <Smartphone className="h-4 w-4" />;
		case "tablet":
			return <Tablet className="h-4 w-4" />;
		default:
			return <Monitor className="h-4 w-4" />;
	}
};

export function DeviceAnalytics({ funnelId }: DeviceAnalyticsProps) {
	const trpc = useTRPC();
	const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");

	const { data, isFetching } = useSuspenseQuery(
		trpc.externalFunnels.getDeviceAnalytics.queryOptions({
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

	return (
		<div className="space-y-6 pt-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h3 className="text-sm font-semibold text-primary">
						Device Analytics
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
				{data.deviceTypes.map((device, index) => (
					<Card key={device.deviceType}>
						<CardHeader className="pb-2">
							<div className="flex items-center gap-2">
								{getDeviceIcon(device.deviceType)}
								<CardDescription className="text-xs">
									{device.deviceType}
								</CardDescription>
							</div>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{device.sessions.toLocaleString()}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{device.percentage}% of total
							</p>
						</CardContent>
					</Card>
				))}
			</div>

			{data.totalSessions === 0 ? (
				<div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
					No device data found. <br /> Data will appear once sessions start
					coming in.
				</div>
			) : (
				<div className="grid gap-6">
					{/* Donut Chart - Device Type Distribution */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Device Type Distribution</CardTitle>
							<CardDescription className="text-xs">
								Session breakdown by device
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={chartConfig} className="h-[400px]">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={data.deviceTypes}
											dataKey="sessions"
											nameKey="deviceType"
											cx="50%"
											cy="50%"
											innerRadius={80}
											outerRadius={140}
											paddingAngle={4}
											label={({ deviceType, percentage }) =>
												`${deviceType}: ${percentage}%`
											}
										>
											{data.deviceTypes.map((entry, index) => (
												<Cell
													key={`cell-${entry.deviceType}`}
													fill={
														DEVICE_COLORS[
															entry.deviceType as keyof typeof DEVICE_COLORS
														] || CHART_COLORS[index % CHART_COLORS.length]
													}
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
																		Device:
																	</span>
																	<span className="text-xs font-semibold">
																		{item.deviceType}
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
																<div className="flex items-center justify-between gap-4">
																	<span className="text-xs text-muted-foreground">
																		CVR:
																	</span>
																	<span className="text-xs font-semibold text-green-600">
																		{item.conversionRate}%
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
										/>
									</PieChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>

					{/* Browser Distribution */}
					{data.browsers && data.browsers.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Browser Distribution</CardTitle>
								<CardDescription className="text-xs">
									Session breakdown by browser
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ChartContainer config={chartConfig} className="h-[350px]">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={data.browsers.slice(0, 10)} layout="vertical">
											<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
											<XAxis type="number" className="text-xs" />
											<YAxis
												type="category"
												dataKey="browser"
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
																			Browser:
																		</span>
																		<span className="text-xs font-semibold">
																			{item.browser}
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
																			CVR:
																		</span>
																		<span className="text-xs font-semibold text-green-600">
																			{item.conversionRate}%
																		</span>
																	</div>
																</div>
															);
														}}
													/>
												}
											/>
											<Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
												{data.browsers.slice(0, 10).map((entry, index) => (
													<Cell
														key={`cell-${entry.browser}`}
														fill={CHART_COLORS[index % CHART_COLORS.length]}
													/>
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</ChartContainer>
							</CardContent>
						</Card>
					)}

					{/* Operating System Distribution */}
					{data.operatingSystems && data.operatingSystems.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Operating System Distribution</CardTitle>
								<CardDescription className="text-xs">
									Session breakdown by OS
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ChartContainer config={chartConfig} className="h-[350px]">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={data.operatingSystems.slice(0, 10)}
											layout="vertical"
										>
											<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
											<XAxis type="number" className="text-xs" />
											<YAxis
												type="category"
												dataKey="os"
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
																			OS:
																		</span>
																		<span className="text-xs font-semibold">
																			{item.os}
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
																			CVR:
																		</span>
																		<span className="text-xs font-semibold text-green-600">
																			{item.conversionRate}%
																		</span>
																	</div>
																</div>
															);
														}}
													/>
												}
											/>
											<Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
												{data.operatingSystems.slice(0, 10).map((entry, index) => (
													<Cell
														key={`cell-${entry.os}`}
														fill={CHART_COLORS[index % CHART_COLORS.length]}
													/>
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</ChartContainer>
							</CardContent>
						</Card>
					)}
				</div>
			)}
		</div>
	);
}
