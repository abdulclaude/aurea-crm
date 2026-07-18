import type { Metadata } from "next";

import { ContentSettingsPage } from "@/features/content-settings/components/content-settings-page";

export const metadata: Metadata = {
  title: "Content settings",
  description: "Manage reusable terminology, FAQs, message macros, and public profiles.",
};

export default function Page(): React.JSX.Element {
  return <ContentSettingsPage />;
}
