import type { Metadata } from "next";

import { SchedulingSettingsPage } from "@/features/studio/components/scheduling-settings";

export const metadata: Metadata = { title: "Scheduling policies" };

export default function SchedulingPoliciesSettingsRoute() {
  return <SchedulingSettingsPage />;
}
