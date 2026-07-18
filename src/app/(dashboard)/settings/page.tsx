import type { Metadata } from "next";

import { SettingsOverview } from "@/features/settings/components/settings-overview";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure workspace settings and operational integrations.",
};

export default function SettingsPage() {
  return <SettingsOverview />;
}
