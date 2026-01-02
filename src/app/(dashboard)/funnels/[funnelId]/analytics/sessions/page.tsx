import { Suspense } from "react";
import { SessionsTable } from "@/features/external-funnels/components/sessions-table";
import { Separator } from "@/components/ui/separator";

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;

  return (
    <div className="">
      <div className="p-6">
        <h1 className="text-base md:text-lg text-primary font-semibold">
          Sessions
        </h1>
        <p className="text-xs md:text-xs text-primary/60">
          Visitor sessions and engagement metrics
        </p>
      </div>

      <Separator />

      <Suspense fallback={<div>Loading sessions...</div>}>
        <SessionsTable funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
