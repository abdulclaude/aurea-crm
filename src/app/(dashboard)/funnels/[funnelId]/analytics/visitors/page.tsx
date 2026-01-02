import { Suspense } from "react";
import { VisitorProfiles } from "@/features/external-funnels/components/visitor-profiles";
import { Separator } from "@/components/ui/separator";

export default async function VisitorsPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;

  return (
    <div className="">
      <div className="p-6">
        <h1 className="text-base md:text-lg text-primary font-semibold">
          Visitors
        </h1>
        <p className="text-xs md:text-xs text-primary/60">
          Profiles, engagement, and lifecycle stages
        </p>
      </div>

      <Separator />

      <Suspense fallback={<div>Loading visitors...</div>}>
        <VisitorProfiles funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
