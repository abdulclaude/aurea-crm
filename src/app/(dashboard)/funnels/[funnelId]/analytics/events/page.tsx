import { Suspense } from "react";
import { EventsTable } from "@/features/external-funnels/components/events-table";
import AppHeader from "@/components/sidebar/app-header";
import { Separator } from "@/components/ui/separator";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ funnelId: string }>;
}) {
  const { funnelId } = await params;

  return (
    <div className="">
      <div className="p-6">
        <h1 className="text-base md:text-lg text-primary font-semibold">
          Events
        </h1>
        <p className="text-xs md:text-xs text-primary/60">
          All events tracked on your funnel
        </p>
      </div>

      <Separator />

      <Suspense fallback={<div>Loading events...</div>}>
        <EventsTable funnelId={funnelId} />
      </Suspense>
    </div>
  );
}
