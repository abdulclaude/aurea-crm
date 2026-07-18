import type { Metadata } from "next";

import { Separator } from "@/components/ui/separator";
import { AdConversionAccountSettings } from "@/features/provider-accounts/components/ad-conversion-account-settings";

export const metadata: Metadata = { title: "Conversion Provider Accounts" };

export default function ProviderAccountsPage() {
  return (
    <div className="space-y-0">
      <div className="p-6">
        <h1 className="text-lg font-semibold text-primary">
          Conversion provider accounts
        </h1>
        <p className="text-xs text-primary/70">
          Manage advertising conversion accounts available to this workspace.
        </p>
      </div>
      <Separator />
      <div className="max-w-4xl p-6">
        <AdConversionAccountSettings />
      </div>
    </div>
  );
}
