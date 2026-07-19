import type { Metadata } from "next";

import { ManagedVoiceSettings } from "@/features/communications/components/managed-voice-settings";
import { CommunicationSettingsPage } from "@/features/settings/components/communication-settings-page";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Voice settings" };

export default async function VoiceSettingsRoute() {
  await prefetch(trpc.communications.overview.queryOptions());
  return (
    <HydrateClient>
      <CommunicationSettingsPage
        title="Voice"
        description="Manage calling numbers, forwarding, recording policy, and voice readiness."
      >
        <ManagedVoiceSettings />
      </CommunicationSettingsPage>
    </HydrateClient>
  );
}
