import { Suspense } from "react";
import { WebVitalsTab } from "@/features/external-funnels/components/web-vitals-tab";
import { Separator } from "@/components/ui/separator";

export default async function WebVitalsPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;
  
  return (
    <div className="">
      <div className="p-6">
        <h1 className="text-base md:text-lg text-primary font-semibold">
          Web vitals
        </h1>
        <p className="text-xs md:text-xs text-primary/60">
          Core Web Vitals and page performance metrics
        </p>
      </div>

      <Separator />

      <Suspense fallback={<div>Loading web vitals...</div>}>
        <WebVitalsTab funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
