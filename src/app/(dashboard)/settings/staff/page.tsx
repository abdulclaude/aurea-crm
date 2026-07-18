import type { Metadata } from "next";

import { StaffSettingsPage } from "@/features/staff-settings/components/staff-settings-page";

export const metadata: Metadata = {
  title: "Staff settings",
  description: "Manage staff operations and compensation policy defaults.",
};

export default function StaffSettingsRoute(): React.JSX.Element {
  return <StaffSettingsPage />;
}
