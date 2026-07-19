import type { Metadata } from "next";

import { MailboxBlocklistSettings } from "@/features/communications/components/mailbox-blocklist-settings";
import { CommunicationSettingsPage } from "@/features/settings/components/communication-settings-page";

export const metadata: Metadata = { title: "Mailbox blocklist" };

export default function MailboxBlocklistRoute() {
  return (
    <CommunicationSettingsPage
      title="Blocklist"
      description="Ignore inbound senders and domains before they create inbox conversations."
    >
      <MailboxBlocklistSettings />
    </CommunicationSettingsPage>
  );
}
