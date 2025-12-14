import { Metadata } from "next";
import { FunnelsList } from "@/features/funnel-builder/components/funnels-list";

export const metadata: Metadata = {
  title: "Funnels",
  description: "Manage your sales funnels and landing pages",
};

export default function FunnelsPage() {
  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funnels</h1>
          <p className="text-muted-foreground">
            Build and manage high-converting funnels and landing pages
          </p>
        </div>
      </div>

      <FunnelsList />
    </div>
  );
}
