import { Suspense } from "react";
import { RealtimeDashboard } from "@/features/external-funnels/components/realtime-dashboard";

export default async function RealtimePage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Real-time Dashboard</h1>
        <p className="text-muted-foreground">
          Live visitor activity and events
        </p>
      </div>
      
      <Suspense fallback={<div>Loading real-time dashboard...</div>}>
        <RealtimeDashboard funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
