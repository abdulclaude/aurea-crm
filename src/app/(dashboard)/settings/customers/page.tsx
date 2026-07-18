import type { Metadata } from "next";

import { CustomerSettingsPage } from "@/features/customer-settings/components/customer-settings-page";

export const metadata: Metadata = {
  title: "Customer settings",
  description:
    "Manage customer fields, tags, note templates, and household policies.",
};

export default function Page(): React.JSX.Element {
  return <CustomerSettingsPage />;
}
