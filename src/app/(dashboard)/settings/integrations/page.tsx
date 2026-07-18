import type { Metadata } from "next";

import { Separator } from "@/components/ui/separator";
import { IntegrationSettings } from "@/features/provider-accounts/components/integration-settings";

export const metadata: Metadata = { title: "Integration accounts" };

export default function IntegrationsSettingsPage() {
  return (
    <div>
      <div className="p-6">
        <h1 className="text-lg font-semibold">Integration accounts</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage scoped marketplace, access, marketing, meeting, and fitness providers.
        </p>
      </div>
      <Separator />
      <div className="p-6">
        <IntegrationSettings />
      </div>
    </div>
  );
}
