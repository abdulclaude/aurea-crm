import { Suspense } from "react";
import { TrafficSourcesTable } from "@/features/external-funnels/components/traffic-sources-table";

export default async function SourcesPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Traffic Sources</h1>
        <p className="text-muted-foreground">
          Where your visitors are coming from
        </p>
      </div>
      
      <Suspense fallback={<div>Loading traffic sources...</div>}>
        <TrafficSourcesTable funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
