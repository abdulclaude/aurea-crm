import { Suspense } from "react";
import { AdsAnalyticsSimple } from "@/features/analytics/components/ads-analytics-simple";

export default async function AdsPage({
	params,
}: {
	params: Promise<{ funnelId: string }>;
}) {
	const { funnelId } = await params;

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Ad Performance</h1>
				<p className="text-muted-foreground">
					Track conversions and revenue across Meta, Google, and TikTok
				</p>
			</div>

			<Suspense fallback={<div>Loading ad analytics...</div>}>
				<AdsAnalyticsSimple funnelId={funnelId} />
			</Suspense>
		</div>
	);
}
