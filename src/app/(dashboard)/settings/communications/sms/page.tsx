import type { Metadata } from "next";

import { ManagedSmsSettings } from "@/features/communications/components/managed-sms-settings";
import { CommunicationSettingsPage } from "@/features/settings/components/communication-settings-page";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "SMS settings" };

export default async function SmsSettingsRoute() {
  await prefetch(trpc.communications.overview.queryOptions());
  return (
    <HydrateClient>
      <CommunicationSettingsPage
        title="SMS"
        description="Manage phone numbers, compliance, spending, and text-message readiness."
      >
        <ManagedSmsSettings />
      </CommunicationSettingsPage>
    </HydrateClient>
  );
}
