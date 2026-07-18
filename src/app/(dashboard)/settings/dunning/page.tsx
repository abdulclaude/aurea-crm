import type { Metadata } from "next";

import { RecoveryPolicySettingsPage } from "@/features/commerce/components/recovery/recovery-policy-settings-page";

export const metadata: Metadata = { title: "Payment Recovery Policies" };

export default function DunningSettingsRoute() {
  return <RecoveryPolicySettingsPage />;
}
