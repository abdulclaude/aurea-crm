import { Suspense } from "react";
import { UTMAnalytics } from "@/features/external-funnels/components/utm-analytics";

export default async function UTMPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">UTM Analytics</h1>
        <p className="text-muted-foreground">
          Campaign tracking and attribution
        </p>
      </div>
      
      <Suspense fallback={<div>Loading UTM analytics...</div>}>
        <UTMAnalytics funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
