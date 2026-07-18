import type { Metadata } from "next";

import { CommunicationsSettings } from "@/features/settings/components/communications-settings";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Communications" };

export default async function CommunicationsSettingsPage() {
  await prefetch(trpc.communications.overview.queryOptions());

  return (
    <HydrateClient>
      <CommunicationsSettings />
    </HydrateClient>
  );
}
