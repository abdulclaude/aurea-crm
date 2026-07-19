import type { Metadata } from "next";

import { CommunicationsUsage } from "@/features/communications/components/communications-usage";
import { CommunicationSettingsPage } from "@/features/settings/components/communication-settings-page";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Communication usage" };

export default async function CommunicationUsageRoute() {
  await prefetch(trpc.communications.overview.queryOptions());
  return (
    <HydrateClient>
      <CommunicationSettingsPage
        title="Usage"
        description="Review current email, SMS, and voice usage and charges."
      >
        <CommunicationsUsage />
      </CommunicationSettingsPage>
    </HydrateClient>
  );
}
