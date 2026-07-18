import type { Metadata } from "next";

import { CancellationSettingsPage } from "@/features/studio/components/cancellation";

export const metadata: Metadata = { title: "Cancellations" };

export default function CancellationsSettingsRoute() {
  return <CancellationSettingsPage />;
}
