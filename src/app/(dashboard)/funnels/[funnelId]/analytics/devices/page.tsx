import { Suspense } from "react";
import { DeviceAnalytics } from "@/features/external-funnels/components/device-analytics";
import { Separator } from "@/components/ui/separator";

export default async function DevicesPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;

  return (
    <div className="">
      <div className="p-6">
        <h1 className="text-base md:text-lg text-primary font-semibold">
          Device analytics
        </h1>
        <p className="text-xs md:text-xs text-primary/60">
          Devices, browsers and analytics
        </p>
      </div>

      <Separator />

      <Suspense fallback={<div>Loading device analytics...</div>}>
        <DeviceAnalytics funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
