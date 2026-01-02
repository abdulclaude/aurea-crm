import { Suspense } from "react";
import { GeographyAnalytics } from "@/features/external-funnels/components/geography-analytics";

export default async function GeographyPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Geography</h1>
        <p className="text-muted-foreground">
          Where your visitors are located
        </p>
      </div>
      
      <Suspense fallback={<div>Loading geography...</div>}>
        <GeographyAnalytics funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
