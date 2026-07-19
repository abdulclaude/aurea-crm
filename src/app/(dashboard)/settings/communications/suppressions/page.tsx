import type { Metadata } from "next";

import { CommunicationSuppressionsSettings } from "@/features/communications/components/communication-suppressions-settings";
import { CommunicationSettingsPage } from "@/features/settings/components/communication-settings-page";

export const metadata: Metadata = { title: "Communication suppressions" };

export default function CommunicationSuppressionsRoute() {
  return (
    <CommunicationSettingsPage
      title="Suppressions"
      description="Control destinations that must not receive marketing or operational messages."
    >
      <CommunicationSuppressionsSettings />
    </CommunicationSettingsPage>
  );
}
