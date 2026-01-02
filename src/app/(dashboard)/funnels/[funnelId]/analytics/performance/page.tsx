import { Suspense } from "react";
import { PerformanceAnalytics } from "@/features/external-funnels/components/performance-analytics";

export default async function PerformancePage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Performance</h1>
        <p className="text-muted-foreground">
          Session engagement and activity metrics
        </p>
      </div>
      
      <Suspense fallback={<div>Loading performance...</div>}>
        <PerformanceAnalytics funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
