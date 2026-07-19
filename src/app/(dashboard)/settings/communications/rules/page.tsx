import type { Metadata } from "next";

import { CommunicationRulesSettings } from "@/features/communications/components/communication-rules-settings";
import { CommunicationSettingsPage } from "@/features/settings/components/communication-settings-page";

export const metadata: Metadata = { title: "Communication rules" };

export default function CommunicationRulesRoute() {
  return (
    <CommunicationSettingsPage
      title="Rules"
      description="Create and version reusable email and SMS content rules."
    >
      <CommunicationRulesSettings />
    </CommunicationSettingsPage>
  );
}
