import { Suspense } from "react";
import { DeviceAnalytics } from "@/features/external-funnels/components/device-analytics";

export default async function DevicesPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Device Analytics</h1>
        <p className="text-muted-foreground">
          Devices, browsers, and operating systems
        </p>
      </div>
      
      <Suspense fallback={<div>Loading device analytics...</div>}>
        <DeviceAnalytics funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
