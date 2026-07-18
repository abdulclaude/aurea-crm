import type { Metadata } from "next";

import { Separator } from "@/components/ui/separator";
import { CalComSettings } from "@/features/bookings/components/calcom-settings";

export const metadata: Metadata = { title: "Cal.com integration" };

export default function CalComSettingsPage() {
  return (
    <div>
      <div className="p-8">
        <h1 className="text-xl font-semibold">Cal.com</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Manage the scheduling account connected to this location.
        </p>
      </div>
      <Separator />
      <div className="max-w-4xl p-8">
        <CalComSettings />
      </div>
    </div>
  );
}
