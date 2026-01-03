import { Suspense } from "react";
import { GeographyAnalytics } from "@/features/external-funnels/components/geography-analytics";
import { Separator } from "@/components/ui/separator";

export default async function GeographyPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;

  return (
    <div className="">
      <div className="p-6">
        <h1 className="text-base md:text-lg text-primary font-semibold">
          Locations
        </h1>
        <p className="text-xs md:text-xs text-primary/60">
          Where your visitors have located
        </p>
      </div>

      <Separator />

      <Suspense fallback={<div>Loading geography...</div>}>
        <GeographyAnalytics funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
