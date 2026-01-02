import { Suspense } from "react";
import { WebVitalsTab } from "@/features/external-funnels/components/web-vitals-tab";

export default async function WebVitalsPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Web Vitals</h1>
        <p className="text-muted-foreground">
          Core Web Vitals and page performance metrics
        </p>
      </div>
      
      <Suspense fallback={<div>Loading web vitals...</div>}>
        <WebVitalsTab funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
