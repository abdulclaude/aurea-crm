import type { Metadata } from "next";

import { EmailSettingsPage } from "@/features/communications/components/email-settings-page";

export const metadata: Metadata = { title: "Email settings" };

export default function EmailSettingsRoute() {
  return <EmailSettingsPage />;
}
