import { Suspense } from "react";
import { FunnelVisualization } from "@/features/external-funnels/components/funnel-visualization";

export default async function FunnelPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Funnel Flow</h1>
        <p className="text-muted-foreground">
          Visualize your funnel stages and conversion rates
        </p>
      </div>
      
      <Suspense fallback={<div>Loading funnel visualization...</div>}>
        <FunnelVisualization funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
