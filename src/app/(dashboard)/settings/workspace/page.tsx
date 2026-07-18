import type { Metadata } from "next";

import { WorkspaceSettingsPage } from "@/features/workspace-settings/components/workspace-settings-page";

export const metadata: Metadata = {
  title: "Workspace settings",
  description: "Manage workspace identity and regional defaults.",
};

export default function Page(): React.JSX.Element {
  return <WorkspaceSettingsPage />;
}
