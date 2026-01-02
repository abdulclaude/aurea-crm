import { Suspense } from "react";
import { AnalyticsOverview } from "@/features/external-funnels/components/analytics-overview";

export default async function FunnelAnalyticsPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Overview</h1>
        <p className="text-muted-foreground">
          Track events, sessions, and conversions for your custom funnel
        </p>
      </div>
      
      <Suspense fallback={<div>Loading analytics...</div>}>
        <AnalyticsOverview funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
