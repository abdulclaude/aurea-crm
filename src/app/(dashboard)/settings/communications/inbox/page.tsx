import type { Metadata } from "next";

import { InboxRouteSettings } from "@/features/inbox/components/inbox-route-settings";
import { CommunicationSettingsPage } from "@/features/settings/components/communication-settings-page";

export const metadata: Metadata = { title: "Inbox settings" };

export default function InboxSettingsRoute() {
  return (
    <CommunicationSettingsPage
      title="Inbox"
      description="Configure inbound addresses, routing, and default conversation ownership."
    >
      <InboxRouteSettings />
    </CommunicationSettingsPage>
  );
}
